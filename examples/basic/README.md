# Serverless Develop Basic Demo

Project consists of two endpoints/functions. One of them depends on module `services/service`. If you decide to change service code, notice that only function which relies on that dependency would be updated.

## Setup
`npm install serverless-develop`

`serverless deploy` - to perform initial deployment

`serverless develop` - to incrementally update your deployed code


