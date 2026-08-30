const API = 'http://localhost:5050/api';
let pass = 0, fail = 0;

const check = (label, ok, extra = '') => {
  if (ok) { pass++; console.log(`  ✔ ${label}`); }
  else { fail++; console.log(`  ✖ ${label} ${extra}`); }
};

async function call(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(API + path, { method, headers, body: payload });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

const stamp = Date.now().toString(36);
const mk = (n) => ({
  firstName: n, lastName: 'Test', username: `${n.toLowerCase()}${stamp}`,
  email: `${n.toLowerCase()}${stamp}@example.com`,
  password: 'passw0rd1', confirmPassword: 'passw0rd1',
});

console.log('\n── Auth ──');
const a = await call('POST', '/auth/signup', { body: { ...mk('Ana'), interests: ['AI', 'Programming', 'Space', 'Music'] } });
const b = await call('POST', '/auth/signup', { body: { ...mk('Ben'), interests: ['AI', 'Programming', 'Gaming'] } });
const c = await call('POST', '/auth/signup', { body: { ...mk('Cal'), interests: ['Cricket', 'Fitness', 'Travel'] } });
check('three accounts created', a.status === 201 && b.status === 201 && c.status === 201, `${a.status}/${b.status}/${c.status}`);
const [A, B, C] = [a.data, b.data, c.data];
check('password never returned', !JSON.stringify(A).includes('passw0rd'));

console.log('\n── Discovery / shared interests ──');
const search = await call('GET', `/users/search?q=${stamp}`, { token: A.token });
check('search finds the other two', search.data.results?.length === 2, JSON.stringify(search.data).slice(0,120));
const top = search.data.results?.[0];
check('ranked by shared-interest count (Ben first, 2 shared)', top?.username === B.user.username && top?.sharedCount === 2, `${top?.username} shared=${top?.sharedCount}`);
check('search results carry no email', !JSON.stringify(search.data).includes('@example.com'));
const filtered = await call('GET', '/users/search?interests=Cricket', { token: A.token });
check('interest filter narrows results', filtered.data.results?.every(r => r.interests.includes('Cricket')));

console.log('\n── Public profile privacy ──');
const prof = await call('GET', `/users/${B.user.username}`, { token: A.token });
check('public profile loads', prof.status === 200);
check('public profile hides email', prof.data.user && !('email' in prof.data.user));
check('public profile shows sharedCount', prof.data.user?.sharedCount === 2);

console.log('\n── Messaging gate before connecting ──');
const early = await call('POST', '/conversations/direct', { token: A.token, body: { userId: B.user._id } });
check('non-friends cannot open a DM', early.status === 403, `got ${early.status}`);

console.log('\n── Connection flow ──');
const req = await call('POST', '/requests', { token: A.token, body: { toUserId: B.user._id } });
check('request sent', req.status === 201, JSON.stringify(req.data));
const dup = await call('POST', '/requests', { token: A.token, body: { toUserId: B.user._id } });
check('duplicate request rejected', dup.status === 409);
const inbox = await call('GET', '/requests', { token: B.token });
check('recipient sees it', inbox.data.incomingCount === 1);
const wrongAccept = await call('PATCH', `/requests/${req.data.request._id}/accept`, { token: C.token });
check('a third party cannot accept', wrongAccept.status === 403, `got ${wrongAccept.status}`);
const accept = await call('PATCH', `/requests/${req.data.request._id}/accept`, { token: B.token });
check('recipient accepts', accept.status === 200 && accept.data.conversation?._id);
const friends = await call('GET', '/users/me/friends', { token: A.token });
check('friendship is mutual', friends.data.friends?.[0]?.username === B.user.username);

console.log('\n── Direct messaging ──');
const convId = accept.data.conversation._id;
const m1 = await call('POST', `/conversations/${convId}/messages`, { token: B.token, body: { content: 'Hey Ana!' } });
check('friend can send', m1.status === 201, JSON.stringify(m1.data).slice(0,120));
const m2 = await call('POST', `/conversations/${convId}/messages`, { token: A.token, body: { content: 'Hi Ben', replyTo: m1.data.message._id } });
check('reply-to works', m2.status === 201 && m2.data.message.replyTo?.content === 'Hey Ana!');
const outsider = await call('GET', `/conversations/${convId}/messages`, { token: C.token });
check('outsider cannot read the thread', outsider.status === 403, `got ${outsider.status}`);
const empty = await call('POST', `/conversations/${convId}/messages`, { token: A.token, body: { content: '  ' } });
check('empty message rejected', empty.status === 400);
const msgs = await call('GET', `/conversations/${convId}/messages`, { token: A.token });
check('history returns both, oldest first', msgs.data.messages?.length === 2 && msgs.data.messages[0].content === 'Hey Ana!');
const list = await call('GET', '/conversations', { token: A.token });
check('conversation list has a preview + title', list.data.conversations?.[0]?.lastMessage?.content === 'Hi Ben' && list.data.conversations[0].title === 'Ben Test');
check('unread count for the recipient', (await call('GET', '/conversations', { token: B.token })).data.conversations[0].unreadCount === 1);
await call('POST', `/conversations/${convId}/read`, { token: B.token });
check('read receipt clears unread', (await call('GET', '/conversations', { token: B.token })).data.conversations[0].unreadCount === 0);

console.log('\n── Attachments (1MB cap) ──');
const small = new FormData();
small.append('content', 'Here is a doc');
small.append('file', new Blob(['hello world'], { type: 'text/plain' }), 'notes.txt');
const up = await call('POST', `/conversations/${convId}/messages`, { token: A.token, form: small });
check('small document accepted', up.status === 201 && up.data.message.attachment?.type === 'document', JSON.stringify(up.data).slice(0,120));
const big = new FormData();
big.append('file', new Blob([new Uint8Array(1024 * 1024 + 500)], { type: 'image/png' }), 'big.png');
const upBig = await call('POST', `/conversations/${convId}/messages`, { token: A.token, form: big });
check('over-1MB file rejected server-side', upBig.status === 413, `got ${upBig.status}`);
const bad = new FormData();
bad.append('file', new Blob(['#!/bin/sh'], { type: 'application/x-sh' }), 'evil.sh');
const upBad = await call('POST', `/conversations/${convId}/messages`, { token: A.token, form: bad });
check('disallowed MIME type rejected', upBad.status === 400, `got ${upBad.status}`);

console.log('\n── Groups ──');
const gf = new FormData();
gf.append('name', `Space Nerds ${stamp}`);
gf.append('mainInterest', 'Space');
gf.append('description', 'All things orbital.');
const grp = await call('POST', '/groups', { token: A.token, form: gf });
check('group created, owner is a member', grp.status === 201 && grp.data.group.isOwner && grp.data.group.memberCount === 1, JSON.stringify(grp.data).slice(0,140));
const gid = grp.data.group._id;
const badInterest = new FormData();
badInterest.append('name', 'Nope'); badInterest.append('mainInterest', 'Underwater Basket Weaving');
check('unknown interest rejected', (await call('POST', '/groups', { token: A.token, form: badInterest })).status === 400);
const notMember = await call('GET', `/conversations/${(await call('GET', `/groups/${gid}`, { token: A.token })).data.conversationId}/messages`, { token: C.token });
check('non-member cannot read group chat', notMember.status === 403, `got ${notMember.status}`);
const join = await call('POST', `/groups/${gid}/join`, { token: C.token });
check('anyone can join', join.status === 200 && join.data.group.memberCount === 2);
const gConv = join.data.conversationId;
const gm = await call('POST', `/conversations/${gConv}/messages`, { token: C.token, body: { content: 'Hello group' } });
check('non-friend member can post in the group', gm.status === 201, `got ${gm.status}`);
const edit = await call('PATCH', `/groups/${gid}`, { token: C.token, form: (() => { const f = new FormData(); f.append('name', 'Hijacked'); return f; })() });
check('non-owner cannot edit', edit.status === 403, `got ${edit.status}`);
const ownerEdit = await call('PATCH', `/groups/${gid}`, { token: A.token, form: (() => { const f = new FormData(); f.append('description', 'Updated by owner'); return f; })() });
check('owner can edit', ownerEdit.status === 200 && ownerEdit.data.group.description === 'Updated by owner');
check('owner cannot leave their own group', (await call('POST', `/groups/${gid}/leave`, { token: A.token })).status === 400);
check('member can leave', (await call('POST', `/groups/${gid}/leave`, { token: C.token })).status === 200);

console.log('\n── Unfriend revokes messaging ──');
await call('DELETE', `/users/me/friends/${B.user._id}`, { token: A.token });
const afterUnfriend = await call('POST', `/conversations/${convId}/messages`, { token: A.token, body: { content: 'still there?' } });
check('cannot message after unfriending', afterUnfriend.status === 403, `got ${afterUnfriend.status}`);

console.log(`\n${'─'.repeat(46)}\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
