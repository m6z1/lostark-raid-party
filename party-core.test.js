const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('./party-core');

test('deduplicates the same synergy and keeps multi-synergy classes', () => {
  const party = [
    { cls: '워로드', role: 'dealer' },
    { cls: '디스트로이어', role: 'dealer' },
    { cls: '건슬링어', role: 'dealer' },
  ];
  assert.deepEqual(core.partySynergies(party).sort(), ['armor', 'crit', 'damage', 'positional']);
});

test('support classes do not add dealer synergy categories', () => {
  assert.deepEqual(core.synergyKeys({ cls: '발키리', role: 'support' }), []);
});

test('classifies glaivier as critical damage synergy', () => {
  assert.deepEqual(core.synergyKeys({ cls: '창술사', role: 'dealer' }), ['critDamage']);
  assert.equal(core.SYNERGIES.critDamage.label, '치명타 피해');
});

test('uses the latest primary dealer synergy categories', () => {
  const expected = {
    발키리: ['critDamage'], 기공사: ['attack'], 스카우터: ['attack'],
    기상술사: ['crit'], 환수사: ['armor'], 차원술사: ['armor'],
    워로드: ['positional', 'damage'], 블레이드: ['positional', 'damage'],
  };
  Object.entries(expected).forEach(([cls, keys]) => {
    assert.deepEqual(core.synergyKeys({ cls, role: 'dealer' }).sort(), keys.sort(), cls);
  });
});

test('8-player split prioritizes distinct synergies while keeping one support per party', () => {
  const members = [
    { name: 's1', role: 'support', cp: 100 }, { name: 's2', role: 'support', cp: 100 },
    { name: 'a', cls: '건슬링어', role: 'dealer', cp: 100 },
    { name: 'b', cls: '아르카나', role: 'dealer', cp: 100 },
    { name: 'c', cls: '디스트로이어', role: 'dealer', cp: 100 },
    { name: 'd', cls: '리퍼', role: 'dealer', cp: 100 },
    { name: 'e', cls: '버서커', role: 'dealer', cp: 100 },
    { name: 'f', cls: '소서리스', role: 'dealer', cp: 100 },
  ];
  const parties = core.splitParties({ members }, 8, c => c.cp);
  assert.deepEqual(parties.map(p => p.filter(c => c.role === 'support').length), [1, 1]);
  assert.deepEqual(parties.map(p => core.partySynergies(p).length), [3, 3]);
});

test('fills one complete raid first when a mixed-role player could block it', () => {
  const pool = [
    { name: 'a-support', pid: 'a', role: 'support', cp: 999 },
    { name: 'a-dealer', pid: 'a', role: 'dealer', cls: '버서커', cp: 100 },
    { name: 'b-support', pid: 'b', role: 'support', cp: 50 },
    { name: 'c-dealer', pid: 'c', role: 'dealer', cls: '건슬링어', cp: 100 },
    { name: 'd-dealer', pid: 'd', role: 'dealer', cls: '디스트로이어', cp: 100 },
  ];
  const groups = core.buildGroups(pool, 4, c => c.cp);
  assert.equal(groups[0].complete, true);
  assert.deepEqual(groups[0].members.map(c => c.pid).sort(), ['a', 'b', 'c', 'd']);
  assert.equal(groups[0].members.find(c => c.pid === 'b').role, 'support');
  assert.equal(groups[1].members[0].name, 'a-support');
});

test('returns a full group before any partial remainder', () => {
  const pool = [
    { pid: 's', role: 'support', cp: 100 },
    { pid: 'a', role: 'dealer', cls: '버서커', cp: 100 },
    { pid: 'b', role: 'dealer', cls: '건슬링어', cp: 100 },
    { pid: 'c', role: 'dealer', cls: '디스트로이어', cp: 100 },
    { pid: 'd', role: 'dealer', cls: '리퍼', cp: 100 },
  ];
  const groups = core.buildGroups(pool, 4, c => c.cp);
  assert.equal(groups[0].complete, true);
  assert.equal(groups[0].members.length, 4);
  assert.equal(groups[1].complete, false);
  assert.equal(groups[1].members.length, 1);
});

test('recent party history deduplicates snapshots and respects its limit', () => {
  let history = [];
  for (let i = 0; i < 7; i++) {
    history = core.addHistoryEntry(history, { players: [{ name: `player-${i}` }] }, `id-${i}`, i, 5);
  }
  assert.equal(history.length, 5);
  assert.equal(history[0].id, 'id-6');
  assert.equal(history[4].id, 'id-2');

  history = core.addHistoryEntry(history, { players: [{ name: 'player-4' }] }, 'new-id', 99, 5);
  assert.equal(history.length, 5);
  assert.equal(history[0].id, 'new-id');
  assert.equal(history.filter(item => item.state.players[0].name === 'player-4').length, 1);
});
