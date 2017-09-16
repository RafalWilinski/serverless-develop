'use strict';
const nodemon = require('nodemon');
const path = require('path');
const fs = require('fs');
const madge = require('madge');
const spawn = require('child_process').spawn;

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.originalOptions = options;
    this.options = options || {};
    this.functionLastHashes = {};
    this.packagePath = this.options.package ||
      this.serverless.service.package.path ||
      path.join(this.serverless.config.servicePath || '.', '.serverless');
    this.provider = this.serverless.getProvider('aws');

    this.commands = {
      develop: {
        usage: 'Continiously deploys your functions to AWS Lambda as you code.',
        lifecycleEvents: [
          'prepare',
          'watch',
        ],
      },
    };

    this.hooks = {
      'develop:prepare': this.packageFunction.bind(this, 0),
      'develop:watch': this.watch.bind(this),
    };

    this.getBaseEndpoint();
  }

  packageFunction(index) {
    const functions = Object.keys(this.serverless.service.functions);
    const functionsCount = functions.length;
    const progress = (index / functionsCount) * 100;
    const functionName = functions[index];

    if (index === 0) {
      this.serverless.cli.log('Building initial packages, this might take a while.');
    }

    this.originalOptions.function = functionName;
    this.serverless.cli.log(`[${progress}%] Preparing serverless-develop...`);

    return this.serverless.pluginManager.spawn('package:function').then(() => {
      if (index + 1 < functionsCount) {
        return this.packageFunction(index + 1);
      } else {
        return Promise.resolve();
      }
    });
  }

  getBaseEndpoint() {
    return this.provider.request('CloudFormation',
      'describeStacks',
      {
        StackName: `${this.serverless.service.service}-dev`
      },
      'dev',
      'us-east-1'
    ).then((result) => {
      if (result) {
        const outputs = result.Stacks[0].Outputs;
        outputs.forEach((output) => {
          if (output.OutputKey === 'ServiceEndpoint') {
            this.baseUrl = output.OutputValue;
          }
        });
      }
    });
  }

  getFunctionEndpoint(functionName) {
    const functionObject = this.serverless.service.getFunction(functionName);

    functionObject.events.forEach(event => {
      if (event.http) {
        let method;
        let path;

        if (typeof event.http === 'object') {
          method = event.http.method.toUpperCase();
          path = event.http.path;
        } else {
          method = event.http.split(' ')[0].toUpperCase();
          path = event.http.split(' ')[1];
        }

        path = path !== '/' ? `/${path.split('/').filter(p => p !== '').join('/')}` : '';

        this.serverless.cli.log(`Function URL: ${this.baseUrl}${path}`);
      }
    });
  }

  deployFunction(functionName, artifactPath) {
    const FunctionName = `${this.serverless.service.service}-dev-${functionName}`;
    this.serverless.cli.log(`Deploying ${functionName}...`);

    return this.provider.request(
      'Lambda',
      'updateFunctionCode',
      {
        FunctionName,
        ZipFile: fs.readFileSync(artifactPath),
      },
      this.options.stage, this.options.region
    ).then(() => {
      this.serverless.cli.log(`Successfully deployed function: ${functionName}`);
      this.getFunctionEndpoint(functionName);
    });
  }

  packageFunctionIncrementally(functionName, changedFiles) {
    const zipFileName = `.serverless/${functionName}.zip`;

    this.serverless.cli.log(`Packaging ${functionName}...`);

    const zipOperation = spawn('zip', [
      zipFileName,
      ...(changedFiles.map(file => `.${file}`)),
    ]);

    // zipOperation.stdout.on('data', (buf) => this.serverless.cli.log(buf.toString()));
    // zipOperation.stderr.on('data', (buf) => this.serverless.cli.log(buf.toString()));
    zipOperation.on('close', () => this.deployFunction(functionName, zipFileName));
  }

  watch() {
    nodemon({
      script: '*.js',
      ext: 'js json',
    });

    nodemon.on('start', () => {
      this.serverless.cli.log('Serverless-develop ready!');
    }).on('quit', function () {
      console.log('Quitting serverless-develop...');

      process.exit();
    }).on('restart', (changedFiles) => {
      const changedFilesRelativePaths = changedFiles.map(file => file.split(`${process.cwd()}`)[1]);
      const functionNames = Object.keys(this.serverless.service.functions);

      this.serverless.cli.log(`App restarted due to: ${changedFilesRelativePaths}`);

      functionNames.forEach(functionName => {
        const functionObject = this.serverless.service.getFunction(functionName);
        const functionMainFileName = `${functionObject.handler.split('.')[0]}.js`;
        const funcPath = path.join(`${process.cwd()}`, functionMainFileName);

        changedFilesRelativePaths.forEach(relativePath => {
          if (relativePath.indexOf(functionMainFileName) > -1) {
            this.packageFunctionIncrementally(functionName, changedFilesRelativePaths);
          }
        })

        madge(funcPath).then(res => {
          res.obj()[functionMainFileName].forEach(dependency => {
            changedFilesRelativePaths.forEach(relativePath => {
              if (relativePath.indexOf(dependency) > -1) {
                this.packageFunctionIncrementally(functionName, changedFilesRelativePaths);
              };
            });
          });
        });
      });
    });
  }
}

module.exports = ServerlessPlugin;
