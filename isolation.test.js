const test = require('node:test');
const assert = require('node:assert/strict');

const BASE = 'http://localhost:3000';

async function call(path, token, method = 'GET', body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function login(email) {
  const r = await call('/login', null, 'POST', { email, password: 'demo123' });
  assert.equal(r.status, 200, 'login failed for ' + email);
  return r.data.token;
}

async function allTasks(token) {
  const projects = (await call('/api/projects', token)).data;
  const lists = await Promise.all(
    projects.map(p => call('/api/projects/' + p.id + '/tasks', token))
  );
  return lists.flatMap(r => r.data);
}

test('Beta owner sirf Beta ke projects dekhta hai', async () => {
  const token = await login('owner@beta.com');
  const r = await call('/api/projects', token);
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.map(p => p.name), ['Q4 Marketing Campaign']);
});

test('Beta owner Acme ke project ke tasks nahi dekh sakta (404)', async () => {
  const acme = await login('owner@acme.com');
  const beta = await login('owner@beta.com');
  const acmeProject = (await call('/api/projects', acme)).data[0];

  const r = await call('/api/projects/' + acmeProject.id + '/tasks', beta);
  assert.equal(r.status, 404);
});

test('Beta owner Acme ka task status nahi badal sakta (404)', async () => {
  const acme = await login('owner@acme.com');
  const beta = await login('owner@beta.com');
  const task = (await allTasks(acme))[0];

  const r = await call('/api/tasks/' + task.id + '/status', beta, 'PATCH', { status: 'done' });
  assert.equal(r.status, 404);
});

test('Employee project nahi bana sakta (403)', async () => {
  const token = await login('employee@acme.com');
  const r = await call('/api/projects', token, 'POST', { name: 'Hack' });
  assert.equal(r.status, 403);
});

test('Employee ko sirf apne assigned tasks dikhte hain', async () => {
  const token = await login('employee@acme.com');
  const me = (await call('/me', token)).data;
  const tasks = await allTasks(token);

  assert.ok(tasks.length > 0, 'Emma ke paas tasks hone chahiye');
  assert.ok(tasks.every(t => t.assignee_id === me.id));
});

test('Employee dusre ka task update nahi kar sakta (403)', async () => {
  const owner = await login('owner@acme.com');
  const emp = await login('employee@acme.com');
  const me = (await call('/me', emp)).data;
  const others = (await allTasks(owner)).find(t => t.assignee_id !== me.id);

  const r = await call('/api/tasks/' + others.id + '/status', emp, 'PATCH', { status: 'done' });
  assert.equal(r.status, 403);
});