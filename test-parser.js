const fs = require('fs');
const data = JSON.parse(fs.readFileSync('sidebar-results.json', 'utf16le'));
data.testResults.forEach(suite => {
  suite.assertionResults.forEach(test => {
    if (test.status === 'failed') {
      console.log(`\n--- FAILED TEST: ${test.title} ---`);
      test.failureMessages.forEach(msg => console.log(msg));
    }
  });
});
