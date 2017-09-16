'use strict';
const nodemon = require('nodemon');
const spawn = require('child_process').spawn;

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.commands = {
      develop: {
        usage: 'Continiously deploys your functions to AWS Lambda as you code.',
        lifecycleEvents: [
          'watch',
        ],
      },
    };

    this.hooks = {
      'develop:watch': this.watch.bind(this),
    };

    // find the serverless sdk
    this.serverless.pluginManager.plugins.forEach(plugin => {
      if (plugin.constructor.name === 'AwsInfo') {
        this.provider = plugin.provider;
      }
    });

    this.getBaseEndpoint();
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

        this.serverless.cli.log(`New version deployed: ${this.baseUrl}${path}`);
      }
    });
  }

  watch() {
    nodemon({
      script: '*.js',
      ext: 'js json',
    });

    nodemon.on('start', () => {
      this.serverless.cli.log('Development mode started...');
    }).on('quit', function () {
      console.log('Quitting development mode...');

      process.exit();
    }).on('restart', (files) => {
      this.serverless.cli.log('App restarted due to: ', files);
      const functionNames = Object.keys(this.serverless.service.functions);

      functionNames.forEach(functionName => {
        this.serverless.cli.log(`Deploying ${functionName}...`);

        const dep = spawn(
          'serverless',
          [
            'deploy',
            'function',
            '-f',
            functionName
          ]
        );

        dep.stdout.on('data', (buf) => this.serverless.cli.log(buf.toString()));
        dep.stderr.on('data', (buf) => this.serverless.cli.log(buf.toString()));
        dep.on('close', () => this.getFunctionEndpoint(functionName));
      });
    });
  }
}

module.exports = ServerlessPlugin;
