describe('Cycle A Payments combined date-range failure runtime', () => {
  const sessionValue = 'cycle-a-payments-combined-range-failure-token';
  let paymentsReads = 0;

  beforeEach(() => {
    paymentsReads = 0;
    cy.intercept('GET', '**/subscription-payments*', (req) => {
      paymentsReads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${sessionValue}`);

      const url = new URL(req.url);
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const plan = url.searchParams.get('plan');

      if (paymentsReads === 1) {
        expect(from).to.eq(null);
        expect(to).to.eq(null);
        expect(plan).to.eq(null);
        req.reply({
          statusCode: 200,
          body: {
            data: {
              payments: [
                {
                  id: 921,
                  shop_name: 'Cycle A Before Range Shop',
                  plan_name: 'Basic',
                  amount: '499.00',
                  payment_method: 'CARD',
                  paid_at: '2026-08-31T10:00:00.000Z',
                  status: 'paid'
                },
                {
                  id: 922,
                  shop_name: 'Cycle A Candidate Range Shop',
                  plan_name: 'Pro',
                  amount: '999.00',
                  payment_method: 'UPI',
                  paid_at: '2026-09-03T10:00:00.000Z',
                  status: 'paid'
                },
                {
                  id: 923,
                  shop_name: 'Cycle A After Range Shop',
                  plan_name: 'Premium',
                  amount: '1999.00',
                  payment_method: 'CARD',
                  paid_at: '2026-09-07T10:00:00.000Z',
                  status: 'paid'
                }
              ]
            }
          }
        });
        return;
      }

      if (paymentsReads === 2) {
        expect(from).to.eq('2026-09-01');
        expect(to).to.eq(null);
        expect(plan).to.eq(null);
        req.reply({
          statusCode: 200,
          body: {
            data: {
              payments: [
                {
                  id: 922,
                  shop_name: 'Cycle A Candidate Range Shop',
                  plan_name: 'Pro',
                  amount: '999.00',
                  payment_method: 'UPI',
                  paid_at: '2026-09-03T10:00:00.000Z',
                  status: 'paid'
                },
                {
                  id: 923,
                  shop_name: 'Cycle A After Range Shop',
                  plan_name: 'Premium',
                  amount: '1999.00',
                  payment_method: 'CARD',
                  paid_at: '2026-09-07T10:00:00.000Z',
                  status: 'paid'
                }
              ]
            }
          }
        });
        return;
      }

      expect(paymentsReads).to.eq(3);
      expect(from).to.eq('2026-09-01');
      expect(to).to.eq('2026-09-04');
      expect(plan).to.eq(null);
      req.reply({
        statusCode: 500,
        body: { message: 'Payment combined date-range filter unavailable' }
      });
    }).as('paymentsBoundary');
  });

  it('surfaces a failed combined-range refetch without presenting the prior From-only rows as range results', () => {
    cy.visit('/admin/payments', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', sessionValue);
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 7, name: 'Cycle A Admin', role: 'platform_admin' })
        );
      }
    });

    cy.wait('@paymentsBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('h4', 'Payments').should('be.visible');
    cy.contains('Cycle A Before Range Shop').should('be.visible');
    cy.contains('Cycle A Candidate Range Shop').should('be.visible');
    cy.contains('Cycle A After Range Shop').should('be.visible');
    cy.contains('button', 'Export CSV').should('be.visible').and('be.enabled');

    cy.get('input[type="date"]').eq(0).should('have.value', '').type('2026-09-01');
    cy.wait('@paymentsBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Cycle A Before Range Shop').should('not.exist');
    cy.contains('Cycle A Candidate Range Shop').should('be.visible');
    cy.contains('Cycle A After Range Shop').should('be.visible');

    cy.get('input[type="date"]').eq(1).should('have.value', '').type('2026-09-04');
    cy.wait('@paymentsBoundary').its('response.statusCode').should('eq', 500);

    cy.contains('Payment combined date-range filter unavailable').should('be.visible');
    cy.contains('Cycle A Before Range Shop').should('not.exist');
    cy.contains('Cycle A Candidate Range Shop').should('not.exist');
    cy.contains('Cycle A After Range Shop').should('not.exist');
    cy.get('input[type="date"]').eq(0).should('have.value', '2026-09-01');
    cy.get('input[type="date"]').eq(1).should('have.value', '2026-09-04');
    cy.get('[role="combobox"]').last().should('contain.text', 'All');
    cy.contains('button', 'Export CSV').should('be.visible').and('be.enabled');
    cy.location('pathname').should('eq', '/admin/payments');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionValue);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.eq(null);
    });
    cy.then(() => expect(paymentsReads).to.eq(3));
  });
});
