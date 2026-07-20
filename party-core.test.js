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
