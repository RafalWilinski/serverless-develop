# Serverless Develop Plugin
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

Deploy your functions to AWS Lambda as you code and get realtime feedback.

## What is this?
Right now, unpolished PoC.

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
First, plugin builds individual artifacts, one for each function. Then, once a change is applied, plugin checks which functions are affected. Then it patches archives located in `.serverless` directory and re-deploys them to AWS Lambda without updating CloudFormation or performing checks.

## Examples:
- [Basic](https://github.com/RafalWilinski/serverless-develop/tree/master/examples/basic)
- [With Babel build pipeline](https://github.com/RafalWilinski/serverless-develop/tree/master/examples/babel)

## Credits and inspiration

Heavily inspired by [@keithwhor's](https://github.com/keithwhor) [article](https://medium.com/@keithwhor/rise-of-functions-as-a-service-how-php-set-the-serverless-stage-20-years-ago-ccb560c5f422) and [@mthenw thoughts](https://github.com/mthenw).


