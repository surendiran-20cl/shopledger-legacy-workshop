'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var orders = require('../lib/orders');
var ledger = require('../lib/ledger');

function makeOrder(id, date) {
  return { id: id, date: date, status: 'completed', customer: 'Walk-in' };
}

function makeSettlementDb() {
  return {
    nextSettlementId: 501,
    customers: [{
      id: 7,
      name: 'Asha Stores',
      openingBalance: 100,
      totalBilled: 200,
      totalSettled: 50
    }],
    settlements: []
  };
}

test('order history sorts calendar dates newest first', function () {
  var db = {
    orders: [
      makeOrder(1, '30/01/2024'),
      makeOrder(2, '31/01/2024'),
      makeOrder(3, '01/02/2024'),
      makeOrder(4, '10/02/2024'),
      makeOrder(5, '11/02/2024')
    ]
  };

  var result = orders.list(db, {});

  assert.deepEqual(result.map(function (order) { return order.id; }), [5, 4, 3, 2, 1]);
});

test('ISO from-date filtering includes only orders on or after that calendar date', function () {
  var db = {
    orders: [
      makeOrder(1, '30/01/2024'),
      makeOrder(2, '31/01/2024'),
      makeOrder(3, '01/02/2024'),
      makeOrder(4, '10/02/2024'),
      makeOrder(5, '11/02/2024')
    ]
  };

  var result = orders.list(db, { from: '2024-02-01' });

  assert.deepEqual(result.map(function (order) { return order.id; }), [5, 4, 3]);
});

test('ISO to-date filtering includes only orders on or before that calendar date', function () {
  var db = {
    orders: [
      makeOrder(1, '30/01/2024'),
      makeOrder(2, '31/01/2024'),
      makeOrder(3, '01/02/2024'),
      makeOrder(4, '10/02/2024'),
      makeOrder(5, '11/02/2024')
    ]
  };

  var result = orders.list(db, { to: '2024-02-10' });

  assert.deepEqual(result.map(function (order) { return order.id; }), [4, 3, 2, 1]);
});

test('settlement amount passed as a request string is added numerically to the balance', function () {
  var db = makeSettlementDb();

  var result = ledger.recordSettlement(db, 7, '25', 'upi', 'counter payment');

  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 75);
  assert.equal(result.customer.balance, 225);
  assert.equal(result.settlement.amount, 25);
  assert.equal(db.settlements.length, 1);
});

test('numeric settlement amounts update the balance arithmetically', function () {
  var db = makeSettlementDb();

  var result = ledger.recordSettlement(db, 7, 25, 'upi', 'counter payment');

  assert.equal(result.customer.totalSettled, 75);
  assert.equal(result.customer.balance, 225);
  assert.equal(result.settlement.amount, 25);
});
