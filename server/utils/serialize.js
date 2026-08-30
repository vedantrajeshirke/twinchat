import { ConnectionRequest } from '../models/ConnectionRequest.js';

const id = (v) => String(v?._id ?? v);

/**
 * Builds the relationship map a viewer has with a set of users, in one query
 * pair rather than one per row.
 * → Map<userId, 'self'|'friend'|'request_sent'|'request_received'|'none'>
 */
export async function relationshipMap(viewer, userIds) {
  const others = userIds.map(id).filter((u) => u !== id(viewer._id));
  const map = new Map(others.map((u) => [u, 'none']));
  map.set(id(viewer._id), 'self');

  const friendSet = new Set(viewer.friends.map(id));
  for (const other of others) if (friendSet.has(other)) map.set(other, 'friend');

  const pending = await ConnectionRequest.find({
    status: 'pending',
    $or: [
      { from: viewer._id, to: { $in: others } },
      { from: { $in: others }, to: viewer._id },
    ],
  })
    .select('from to')
    .lean();

  for (const req of pending) {
    if (id(req.from) === id(viewer._id)) {
      if (map.get(id(req.to)) === 'none') map.set(id(req.to), 'request_sent');
    } else if (map.get(id(req.from)) === 'none') {
      map.set(id(req.from), 'request_received');
    }
  }

  return map;
}

/** Public fields only: never email or password (PROJECT_PLAN §9). */
export function publicUser(user) {
  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    bio: user.bio ?? '',
    profilePicture: user.profilePicture ?? '',
    interests: user.interests ?? [],
    createdAt: user.createdAt,
  };
}

/** publicUser + the viewer's shared-interest count and relationship. */
export function userCard(user, viewerInterests, relationship = 'none') {
  const mine = new Set(viewerInterests ?? []);
  const shared = (user.interests ?? []).filter((i) => mine.has(i));
  return {
    ...publicUser(user),
    sharedInterests: shared,
    sharedCount: shared.length,
    relationship,
  };
}

/** Convenience: cards for a list of users, with relationships resolved. */
export async function userCards(users, viewer) {
  const rels = await relationshipMap(viewer, users.map((u) => u._id));
  return users.map((u) => userCard(u, viewer.interests, rels.get(id(u._id)) ?? 'none'));
}

export function groupCard(group, viewer) {
  const members = group.members ?? [];
  return {
    _id: group._id,
    name: group.name,
    description: group.description ?? '',
    mainInterest: group.mainInterest,
    groupPicture: group.groupPicture ?? '',
    owner: group.owner?._id ?? group.owner,
    memberCount: members.length,
    isMember: viewer ? members.some((m) => id(m) === id(viewer._id)) : false,
    isOwner: viewer ? id(group.owner?._id ?? group.owner) === id(viewer._id) : false,
    createdAt: group.createdAt,
  };
}
