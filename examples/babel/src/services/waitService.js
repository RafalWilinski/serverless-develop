const waitPromise = () =>
  new Promise(resolve => {
    setTimeout(() => {
      return resolve();
    }, 1000);
  });

async function wait() {
  await waitPromise();
  console.log("Second passed.");
}

module.exports = {
  wait,
  message: "msg"
};
