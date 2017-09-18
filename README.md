# Serverless Develop Plugin
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-develop.svg)](https://badge.fury.io/js/serverless-develop)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

Deploy your functions to AWS Lambda as you code and get realtime feedback.

## What is this?
Right now, unpolished PoC, however, works.

## What problem does it solve?
Iterating with Serverless Framework is slow.

Plugins like [serverless-offline](https://github.com/dherault/serverless-offline) or [emulator](https://github.com/serverless/emulator) try to solve that problem by Emulating AWS Lambda environment locally. That solution is far from perfect because of different container, different environment, different IAM roles etc. etc. - Inconsistency.

This plugin, instead of running Lambdas offline, deploys your code to AWS Lambda as you type, in realtime. Welcome back to 2000's, where PHP FTP deployments were made every time `CMD+S` was hit.

![Demo](/resources/anim.gif)

## Installation

1. Run `npm install serverless-develop --save`
2. Add `serverless-develop` to your `serverless.yml` `plugins` section:
```yml
plugins:
  - serverless-develop
```
3. Run `serverless develop`

## Configuration

`serverless-develop` can be configured by changing following variables in `serverless.yml` file.


```yml
custom:
  develop:
    middleware:
      - npm run build    # Runs `npm run build` before packaging
    buildPath: build     # Packages files from `build` directory
    sourcePath: src      # Points to source files directory
    changeInterval: 0.2  # Specifies max amount of seconds between deployments
    verbose: true        # Adds much more information what happens under the hood
```

## How does it work?

1. Plugin builds individual artifacts, one for each function
2. After that, plugin watches files for changes
3. Once change is made, function checks affected functions, runs middleware (if any) and adds change to function's archive in `.serverless` directory
4. Deploy using raw AWS-SDK call without performing checks or updating CloudFormation

Note: Right now, [only JS is supported](https://github.com/RafalWilinski/serverless-develop/blob/master/index.js#L204).

## Examples:
- [Basic](https://github.com/RafalWilinski/serverless-develop/tree/master/examples/basic)
- [With Babel build pipeline](https://github.com/RafalWilinski/serverless-develop/tree/master/examples/babel)


## Integration with `serverless-webpack`

To be added...


## Credits and inspiration

Heavily inspired by [@keithwhor's](https://github.com/keithwhor) [article](https://medium.com/@keithwhor/rise-of-functions-as-a-service-how-php-set-the-serverless-stage-20-years-ago-ccb560c5f422) and [@mthenw thoughts](https://github.com/mthenw).

## Contributing

Awesome! All contributions are welcome.

## License

MIT
