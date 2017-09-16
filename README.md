# Serverless Develop Plugin
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

Deploy your functions to AWS Lambda as you code.

## What is this?
Right now, unpolished PoC.

## What problem does it solves?
Iterating with Serverless Framework is slow.

Plugins like [serverless-offline](https://github.com/dherault/serverless-offline) or [emulator](https://github.com/serverless/emulator) try to solve that problem by Emulating AWS Lambda environment locally. That solution is far from perfect because of different container, different environment, different IAM roles etc. etc. - Inconsistency.

This plugin, instead of running Lambdas offline, deploys your code do AWS Lambda as you type. Welcome back to 2000's, where PHP FTP deployments were made every time CMD+S dev hit.

![Demo](https://im4.ezgif.com/tmp/ezgif-4-c331f1bc7d.gif)

## Installation

To be added...

## Credits and inspiration

Heavily inspired by [@keithwhor's](https://github.com/keithwhor) [article](https://medium.com/@keithwhor/rise-of-functions-as-a-service-how-php-set-the-serverless-stage-20-years-ago-ccb560c5f422) and [@mthenw thoughts](https://github.com/mthenw).


