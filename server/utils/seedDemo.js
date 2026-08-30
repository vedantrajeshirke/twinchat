/**
 * A small, believable community so the UI can be exercised without
 * hand-creating accounts. Development only, it wipes the database first.
 *
 *   npm run seed:demo        against a real MONGO_URI
 *   npm run dev:demo         against the zero-config in-memory database
 *
 * Every demo account uses the password: demo1234
 * Log in as any of them: "ada" is the richest account to explore.
 */
import { seedInterests } from './seedInterests.js';
import { User } from '../models/User.js';
import { Group } from '../models/Group.js';
import { ConnectionRequest } from '../models/ConnectionRequest.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { ensureDirectConversation, ensureGroupConversation } from './conversations.js';

const PASSWORD = 'demo1234';

const PEOPLE = [
  { firstName: 'Ada', lastName: 'Okafor', username: 'ada', bio: 'Backend engineer. Currently obsessed with distributed systems and very slow espresso.', interests: ['Programming', 'Technology', 'AI', 'Space', 'Reading/Books', 'Food & Cooking'] },
  { firstName: 'Milo', lastName: 'Fernandes', username: 'milo', bio: 'F1 on Sundays, five-a-side on Wednesdays. Will argue about tyre strategy.', interests: ['F1', 'Football/Soccer', 'Fitness', 'Gaming', 'Technology'] },
  { firstName: 'Priya', lastName: 'Raman', username: 'priya', bio: 'Product designer. Collecting film cameras faster than I can develop the rolls.', interests: ['Art & Design', 'Photography', 'Movies', 'Travel', 'Programming', 'Music'] },
  { firstName: 'Jonas', lastName: 'Berg', username: 'jonas', bio: 'Astrophysics PhD student. Ask me about the James Webb images.', interests: ['Space', 'Science', 'AI', 'Reading/Books', 'Podcasts'] },
  { firstName: 'Nia', lastName: 'Campbell', username: 'nia', bio: 'Writing a novel one paragraph at a time. Currently on paragraph four.', interests: ['Writing', 'Reading/Books', 'Movies', 'History', 'Music', 'Travel'] },
  { firstName: 'Tomás', lastName: 'Ruiz', username: 'tomas', bio: 'Cooking my way through every cuisine, alphabetically. On "G".', interests: ['Food & Cooking', 'Travel', 'Photography', 'Nature/Outdoors', 'Fitness'] },
  { firstName: 'Sana', lastName: 'Malik', username: 'sana', bio: 'Startup finance. I read S-1s for fun, which I accept is a problem.', interests: ['Business & Startups', 'Finance/Investing', 'News & Politics', 'Podcasts', 'Technology'] },
  { firstName: 'Kenji', lastName: 'Sato', username: 'kenji', bio: 'Anime, mechanical keyboards, and long walks to the ramen shop.', interests: ['Anime', 'Gaming', 'Technology', 'Music', 'Food & Cooking'] },
];

const GROUPS = [
  { name: 'Deep Space Nerds', mainInterest: 'Space', description: 'Telescope photos, launch threads, and arguing about whether Pluto counts.', owner: 'jonas', members: ['jonas', 'ada', 'nia'] },
  { name: 'Sunday Race Watch', mainInterest: 'F1', description: 'Live reactions every race weekend. Spoilers are fair game after the flag.', owner: 'milo', members: ['milo', 'kenji', 'tomas'] },
  { name: 'Shipping Things', mainInterest: 'Programming', description: 'For people who build. Show what you shipped this week, however small.', owner: 'ada', members: ['ada', 'priya', 'milo', 'sana'] },
  { name: 'What Are You Cooking', mainInterest: 'Food & Cooking', description: 'Recipes, disasters, and the eternal question of how much salt is too much.', owner: 'tomas', members: ['tomas', 'ada', 'kenji'] },
];

// [from, to]: already-accepted connections.
const FRIENDSHIPS = [
  ['ada', 'priya'], ['ada', 'jonas'], ['ada', 'milo'],
  ['priya', 'nia'], ['milo', 'kenji'], ['tomas', 'kenji'], ['jonas', 'nia'],
];

// Pending requests waiting in someone's inbox.
const PENDING = [
  ['tomas', 'ada'],
  ['sana', 'ada'],
  ['ada', 'kenji'],
];

const DIRECT_CHATS = [
  { between: ['ada', 'priya'], messages: [
    ['priya', 'Did you see the new design system draft?'],
    ['ada', 'Skimmed it this morning. The spacing scale is a big improvement.'],
    ['priya', 'That was the bit I fought hardest for 😄'],
    ['ada', 'It shows. I can actually predict what a component will look like now.'],
    ['priya', 'Highest praise a designer can get, honestly.'],
  ]},
  { between: ['ada', 'jonas'], messages: [
    ['jonas', 'New Webb image dropped. The detail on the dust lanes is unreal.'],
    ['ada', 'Send it over?'],
    ['jonas', 'Posted it in Deep Space Nerds — easier than resizing it twice.'],
    ['ada', 'Looking now.'],
  ]},
  { between: ['ada', 'milo'], messages: [
    ['milo', 'Five-a-side Wednesday, we are one short.'],
    ['ada', "I'm in, but I have not run since roughly 2019."],
    ['milo', 'Perfect, you can go in goal.'],
  ]},
];

const GROUP_CHATS = [
  { group: 'Deep Space Nerds', messages: [
    ['jonas', 'Uploading the Webb shot now — look at the dust lanes on the left edge.'],
    ['nia', 'That is genuinely beautiful. What is the scale on that?'],
    ['jonas', 'Roughly seven light years across the frame.'],
    ['ada', 'Every time I read a number like that I have to sit down for a minute.'],
  ]},
  { group: 'Shipping Things', messages: [
    ['ada', 'Shipped the new search ranking this week. Sorts by shared interests now.'],
    ['priya', 'Does it show *why* something matched?'],
    ['ada', 'Yeah — a badge with the count, and the shared interests get highlighted.'],
    ['sana', 'That is the whole product in one small UI detail.'],
    ['milo', 'Nice. Mine is less glamorous: I deleted 400 lines of dead code.'],
    ['ada', 'That absolutely counts.'],
  ]},
];

const byUsername = new Map();
const find = (u) => byUsername.get(u);

async function reset() {
  await Promise.all([
    User.deleteMany({}), Group.deleteMany({}), ConnectionRequest.deleteMany({}),
    Conversation.deleteMany({}), Message.deleteMany({}),
  ]);
}

/** Wipes the database and reseeds the demo community. Development only. */
export async function seedDemo() {
  byUsername.clear();
  await seedInterests({ quiet: true });
  await reset();

  for (const person of PEOPLE) {
    const user = await User.create({
      ...person,
      email: `${person.username}@twinchat.dev`,
      password: PASSWORD,
    });
    byUsername.set(person.username, user);
  }

  for (const [a, b] of FRIENDSHIPS) {
    const [ua, ub] = [find(a), find(b)];
    await Promise.all([
      User.updateOne({ _id: ua._id }, { $addToSet: { friends: ub._id } }),
      User.updateOne({ _id: ub._id }, { $addToSet: { friends: ua._id } }),
      ConnectionRequest.create({ from: ua._id, to: ub._id, status: 'accepted' }),
    ]);
    await ensureDirectConversation(ua._id, ub._id);
  }

  for (const [from, to] of PENDING) {
    await ConnectionRequest.create({ from: find(from)._id, to: find(to)._id, status: 'pending' });
  }

  for (const spec of GROUPS) {
    const memberIds = spec.members.map((m) => find(m)._id);
    const group = await Group.create({
      name: spec.name,
      description: spec.description,
      mainInterest: spec.mainInterest,
      owner: find(spec.owner)._id,
      members: memberIds,
    });
    await ensureGroupConversation(group);
    await User.updateMany({ _id: { $in: memberIds } }, { $addToSet: { groups: group._id } });
  }

  // Space the messages out over the last couple of days so timestamps and the
  // day separators in the chat window have something real to render.
  const start = Date.now() - 1000 * 60 * 60 * 30;
  let clock = start;
  const nextStamp = () => new Date((clock += 1000 * 60 * (7 + Math.random() * 40)));

  async function post(conversation, senderName, text) {
    const createdAt = nextStamp();
    const message = await Message.create({
      conversation: conversation._id,
      sender: find(senderName)._id,
      content: text,
      readBy: [find(senderName)._id],
      createdAt,
    });
    // timestamps:false: otherwise Mongoose stamps updatedAt with "now" and
    // every seeded conversation ends up with an identical time.
    await Conversation.updateOne(
      { _id: conversation._id },
      { lastMessage: message._id, updatedAt: createdAt },
      { timestamps: false }
    );
    return message;
  }

  for (const thread of DIRECT_CHATS) {
    const [a, b] = thread.between;
    const conversation = await ensureDirectConversation(find(a)._id, find(b)._id);
    for (const [sender, text] of thread.messages) await post(conversation, sender, text);
  }

  for (const thread of GROUP_CHATS) {
    const group = await Group.findOne({ name: thread.group });
    const conversation = await ensureGroupConversation(group);
    for (const [sender, text] of thread.messages) await post(conversation, sender, text);
  }

  // Threads that never got a message would otherwise keep their creation time
  // (i.e. "now") and sort above the active ones. Age them out instead.
  await Conversation.updateMany(
    { lastMessage: null },
    { updatedAt: new Date(start - 1000 * 60 * 60 * 24 * 3) },
    { timestamps: false }
  );

  const counts = {
    users: await User.countDocuments(),
    groups: await Group.countDocuments(),
    conversations: await Conversation.countDocuments(),
    messages: await Message.countDocuments(),
    pendingRequests: await ConnectionRequest.countDocuments({ status: 'pending' }),
  };

  console.log('\n✔ Demo data seeded');
  console.table(counts);
  console.log(`\n  Log in with any username below · password: ${PASSWORD}`);
  console.log(`  ${PEOPLE.map((p) => p.username).join(', ')}`);
  console.log('\n  "ada" has the most going on: 3 chats, 2 pending requests, 3 groups.\n');

  return counts;
}
