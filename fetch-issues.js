const https = require('https');
const fs = require('fs');

const url = 'https://sonarcloud.io/api/issues/search?componentKeys=Loki11Codes_Project-LiveFit&statuses=OPEN,CONFIRMED&impactSoftwareQualities=MAINTAINABILITY&ps=100';

https.get(url, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      const output = data.issues.map(i => `${i.component}:${i.line} - ${i.message}`).join('\n');
      fs.writeFileSync('sonar-issues.txt', output);
      console.log(`Saved ${data.issues.length} issues.`);
    } catch (error) {
      console.error(error.message);
    }
  });

}).on('error', (e) => {
  console.error(e);
});
