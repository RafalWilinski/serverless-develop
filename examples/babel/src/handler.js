"use strict";
const waitService = require("./services/waitService");

module.exports.hello = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: waitService.message,
      input: event
    })
  };

  waitService.wait().then(() => {
    callback(null, response);
  });
};
