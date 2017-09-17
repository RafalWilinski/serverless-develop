module.exports.hello = (event, context, callback) => {
  callback(null, {
    statusCode: 200,
    body: '{"handler2": 2}',
  });
};