import test from 'node:test';
import assert from 'node:assert/strict';
import { isUnifiedTestnetAddress, isShieldedTestnetAddress } from '../server/zcash.mjs';
import { unifiedFixture } from './unified-fixture.mjs';

test('unified testnet validator checks network, checksum, jumble padding and receivers', () => {
  const address = unifiedFixture();
  assert.equal(isShieldedTestnetAddress(address), true);
  assert.equal(
    isUnifiedTestnetAddress(
      unifiedFixture({
        receivers: [
          [0, 20],
          [2, 43],
          [3, 43],
        ],
      }),
    ),
    true,
  );
  for (const invalid of [
    address.slice(0, -1) + (address.endsWith('q') ? 'p' : 'q'),
    address.slice(0, -8),
    unifiedFixture({ prefix: 'u' }),
    unifiedFixture({ paddingPrefix: 'u' }),
    unifiedFixture({
      receivers: [
        [0, 20],
        [1, 20],
        [3, 43],
      ],
    }),
    unifiedFixture({
      receivers: [
        [3, 43],
        [2, 43],
      ],
    }),
    unifiedFixture({ receivers: [[3, 42]] }),
    unifiedFixture({
      receivers: [
        [3, 43],
        [3, 43],
      ],
    }),
    unifiedFixture({
      receivers: [
        [0, 20],
        [4, 43],
      ],
    }),
    'utest1invalid',
    null,
    'utest1' + 'q'.repeat(1024),
  ])
    assert.equal(isShieldedTestnetAddress(invalid), false);
});
