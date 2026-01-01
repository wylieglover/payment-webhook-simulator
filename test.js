const fetch = require('node-fetch');

const api_key = "Bearer trolley_api_wylie123";

const data = {
    recipient: "Wylie Glover",
    amount: 100,
    currency: "USD"
};

const payload = JSON.stringify(data);

console.log('Sending payment request...');

fetch('http://localhost:3001/payments', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': api_key
    },
    body: payload
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));