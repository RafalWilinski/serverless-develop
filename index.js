"use strict";
const watch = require("watch");
const path = require("path");
const fs = require("fs");
const madge = require("madge");
const spawn = require("child_process").spawn;
const execSync = require("child_process").execSync;
const ora = require("ora");

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.originalOptions = options;
    this.options = options || {};
    this.functionLastHashes = {};
    this.provider = this.serverless.getProvider("aws");
    this.packagePath =
      this.options.package ||
      this.serverless.service.package.path ||
      path.join(this.serverless.config.servicePath || ".", ".serverless");

    if (this.serverless.service.custom && this.serverless.service.custom.develop) {
      this.buildPath = this.serverless.service.custom.develop.buildPath;
      this.sourcePath = this.serverless.service.custom.develop.sourcePath;
      this.changeInterval = this.serverless.service.custom.develop.changeInterval || 0.1;
      this.verbose = this.serverless.service.custom.develop.verbose;

      if (this.verbose) {
        this.serverless.cli.log("------------------------");
        this.serverless.cli.log("Running in verbose mode!");
        this.serverless.cli.log("------------------------");
      }
    }

    this.excludePaths = ["node_modules"];
    if (this.buildPath) {
      this.excludePaths.push(this.buildPath);
    }

    this.commands = {
      develop: {
        usage: "Continiously deploys your functions to AWS Lambda as you code.",
        lifecycleEvents: ["prepare", "watch"]
      }
    };

    this.hooks = {
      "develop:prepare": this.packageFunction.bind(this, 0),
      "develop:watch": this.watch.bind(this)
    };
  }

  packageFunction(index) {
    const functions = Object.keys(this.serverless.service.functions);
    const functionsCount = functions.length;
    const progress = index / functionsCount * 100;
    const functionName = functions[index];

    this.initialPackagingSpinner = ora(
      "Building initial artifacts, this might take a while."
    ).start();

    if (index === 0) {
      this.getBaseEndpoint();
    }

    this.originalOptions.function = functionName;
    if (this.verbose) {
      this.serverless.cli.log(`[${progress}%] Preparing serverless-develop...`);
    }

    return this.serverless.pluginManager.spawn("package:function").then(() => {
      if (index + 1 < functionsCount) {
        return this.packageFunction(index + 1);
      } else {
        this.initialPackagingSpinner.succeed("Artifacts built!");
        return Promise.resolve();
      }
    });
  }

  getBaseEndpoint() {
    return this.provider
      .request(
        "CloudFormation",
        "describeStacks",
        {
          StackName: `${this.serverless.service.service}-dev`
        },
        "dev",
        "us-east-1"
      )
      .then(result => {
        if (result) {
          const outputs = result.Stacks[0].Outputs;
          outputs.forEach(output => {
            if (output.OutputKey === "ServiceEndpoint") {
              this.baseUrl = output.OutputValue;
            }
          });
        }
      });
  }

  printFunctionEndpoint(functionName) {
    const functionObject = this.serverless.service.getFunction(functionName);

    functionObject.events.forEach(event => {
      if (event.http) {
        let method;
        let path;

        if (typeof event.http === "object") {
          method = event.http.method.toUpperCase();
          path = event.http.path;
        } else {
          method = event.http.split(" ")[0].toUpperCase();
          path = event.http.split(" ")[1];
        }

        path =
          path !== "/"
            ? `/${path
                .split("/")
                .filter(p => p !== "")
                .join("/")}`
            : "";

        this.serverless.cli.log(`Function URL: ${this.baseUrl}${path}`);
      }
    });
  }

  deployFunction(functionName, artifactPath) {
    const FunctionName = `${this.serverless.service.service}-dev-${functionName}`;
    const deploySpinner = ora(`Deploying ${FunctionName}...`).start();

    return this.provider
      .request(
        "Lambda",
        "updateFunctionCode",
        {
          FunctionName,
          ZipFile: fs.readFileSync(artifactPath)
        },
        this.options.stage,
        this.options.region
      )
      .then(() => {
        deploySpinner.succeed(`Function ${FunctionName} deployed!`);
        this.printFunctionEndpoint(functionName);
      });
  }

  packageFunctionIncrementally(functionName, changedFile) {
    const zipFileName = `.serverless/${functionName}.zip`;
    const spinner = ora(`Packaging ${functionName}...`).start();
    const zipOperation = spawn("zip", [zipFileName, changedFile]);

    if (this.verbose) {
      zipOperation.stdout.on("data", buf => this.serverless.cli.log(buf.toString()));
      zipOperation.stderr.on("data", buf => this.serverless.cli.log(buf.toString()));
    }

    zipOperation.on("close", () => {
      this.deployFunction(functionName, zipFileName);
      spinner.succeed(`Function ${functionName} packed!`);
    });
  }

  runMiddleware() {
    if (
      this.serverless.service.custom &&
      this.serverless.service.custom.develop &&
      this.serverless.service.custom.develop.middleware &&
      this.serverless.service.custom.develop.middleware instanceof Array
    ) {
      this.serverless.service.custom.develop.middleware.forEach(cmd => {
        const spinner = ora(`Running ${cmd}...`).start();
        const execSyncResult = execSync(cmd);
        spinner.succeed(`${cmd} finished!`);

        if (this.verbose) {
          this.serverless.cli.log(execSyncResult);
        }
      });
    }
  }

  update(changedFileAbsolutePath) {
    const changedFileRelativePath = changedFileAbsolutePath.split(process.cwd())[1];
    const compiledFileRelativePath = path.join(this.buildPath || "", changedFileRelativePath);
    const functionNames = Object.keys(this.serverless.service.functions);
    const changedFileBuildAbsolutePath = path.join(
      process.cwd(),
      this.buildPath || "",
      changedFileRelativePath
    );

    this.runMiddleware();

    functionNames.forEach(functionName => {
      const functionObject = this.serverless.service.getFunction(functionName);
      const compiledFunctionPath = `${functionObject.handler.split(".")[0]}.js`;
      const compiledAbsoluteFunctionPath = path.join(process.cwd(), compiledFunctionPath);
      let functionSourcePath = compiledFunctionPath;

      if (this.buildPath) {
        functionSourcePath = compiledFunctionPath.split(this.buildPath)[1];
      }

      const functionAbsoluteSourcePath = path.join(process.cwd(), functionSourcePath);
      let functionMadgePath = compiledFunctionPath;

      if (this.sourcePath) {
        functionMadgePath = functionSourcePath.split(this.sourcePath)[1];
      }

      if (functionMadgePath[0] === "/") {
        functionMadgePath = functionMadgePath.substring(1);
      }

      // Function handler changed
      if (changedFileAbsolutePath === functionAbsoluteSourcePath) {
        this.packageFunctionIncrementally(functionName, compiledFunctionPath);
        return;
      }

      madge(functionAbsoluteSourcePath).then(res => {
        if (this.verbose) {
          this.serverless.cli.log(`Dependency tree: ${JSON.stringify(res.obj(), null, "\t")}`);
        }

        res.obj()[functionMadgePath].forEach(dependency => {
          if (changedFileRelativePath.indexOf(dependency) > -1) {
            this.packageFunctionIncrementally(functionName, compiledFileRelativePath);
          }
        });
      });
    });
  }

  watch() {
    if (this.verbose) {
      this.serverless.cli.log(`Excluded paths: (${this.excludePaths.join("|")})`);
    }

    watch.watchTree(
      path.join(process.cwd(), this.sourcePath || ""),
      {
        interval: this.changeInterval,
        ignoreDirectoryPattern: new RegExp(`(${this.excludePaths.join("|")})`),
        ignoreDotFiles: true
      },
      (changedFilePath, curr, prev) => {
        if (typeof changedFilePath == "object" && prev === null && curr === null) {
          this.serverless.cli.log("Serverless-develop ready!");
        } else if (prev === null) {
          this.serverless.cli.log(`${changedFilePath} added!`);

          this.update(changedFilePath);
        } else if (curr.nlink === 0) {
          this.serverless.cli.log(`${changedFilePath} removed!`);

          this.update(changedFilePath);
        } else {
          this.serverless.cli.log(`${changedFilePath} changed!`);
          this.update(changedFilePath);
        }
      }
    );
  }
}

module.exports = ServerlessPlugin;
