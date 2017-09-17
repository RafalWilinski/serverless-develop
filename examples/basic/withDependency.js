const service = require("./services/service");

module.exports.hello = (event, context, callback) => {
  callback(null, {
    statusCode: 200,
    body: "service.message"
  });
};
