import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const csv = open(__ENV.CSV_FILE || './users.csv');
const lines = csv.split('\n').map(l => l.trim()).filter(l => l !== '');
const header = lines.shift().split(',');
const users = new SharedArray('users', function() {
  return lines.map(line => {
    const cols = line.split(',').map(c => c.trim());
    return { user: cols[0], passwd: cols[1] };
  });
});

export let options = {
  discardResponseBodies: false,
  scenarios: {
    login_rate: {
      executor: 'constant-arrival-rate',
      rate: 20,            
      timeUnit: '1s',      
      duration: '5m',      
      preAllocatedVUs: 10, 
      maxVUs: 200,
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<1500'],  
    'http_req_failed': ['rate<0.03'],     
  },
};

const URL = 'https://fakestoreapi.com/auth/login';

export default function () {
  const u = users[Math.floor(Math.random() * users.length)];

  const payload = JSON.stringify({ username: u.user, password: u.passwd });
  const params = { headers: { 'Content-Type': 'application/json' }, timeout: '60s' };

  const res = http.post(URL, payload, params);

  
  check(res, {
    'status 200': (r) => r.status === 200,
    'response < 1500ms': (r) => r.timings.duration < 1500,
  });

  
  sleep(0.01);
}


import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

export function handleSummary(data) {
  return {
    'summary.html': htmlReport(data),
    'result.json': JSON.stringify(data),
  };
}
