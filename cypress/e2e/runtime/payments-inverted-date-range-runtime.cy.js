describe('Cycle A Payments inverted date-range runtime', () => {
  const sessionValue = 'cycle-a-payments-inverted-range-token';
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
                { id: 831, shop_name: 'Cycle A Valid Payment Shop', plan_name: 'Pro', amount: '999.00', payment_method: 'UPI', paid_at: '2026-09-03T10:00:00.000Z', status: 'paid' }
              ]
            }
          }
        });
        return;
      }

      if (paymentsReads === 2) {
        expect(from).to.eq('2026-09-05');
        expect(to).to.eq(null);
        expect(plan).to.eq(null);
        req.reply({
          statusCode: 200,
          body: {
            data: {
              payments: [
                { id: 832, shop_name: 'Cycle A Late Payment Shop', plan_name: 'Basic', amount: '499.00', payment_method: 'CARD', paid_at: '2026-09-06T10:00:00.000Z', status: 'paid' }
              ]
            }
          }
        });
        return;
      }

      expect(paymentsReads).to.eq(3);
      expect(from).to.eq('2026-09-05');
      expect(to).to.eq('2026-09-01');
      expect(plan).to.eq(null);
      req.reply({
        statusCode: 400,
        body: { message: 'From date must not be after To date' }
      });
    }).as('paymentsBoundary');
  });

  it('surfaces authoritative invalid-range rejection without presenting stale rows as valid range results', () => {
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
    cy.contains('Cycle A Valid Payment Shop').should('be.visible');

    cy.get('input[type="date"]').eq(0).type('2026-09-05');
    cy.wait('@paymentsBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Cycle A Late Payment Shop').should('be.visible');
    cy.contains('Cycle A Valid Payment Shop').should('not.exist');

    cy.get('input[type="date"]').eq(1).type('2026-09-01');
    cy.wait('@paymentsBoundary').its('response.statusCode').should('eq', 400);

    cy.contains('From date must not be after To date').should('be.visible');
    cy.contains('Cycle A Late Payment Shop').should('not.exist');
    cy.contains('Cycle A Valid Payment Shop').should('not.exist');
    cy.get('input[type="date"]').eq(0).should('have.value', '2026-09-05');
    cy.get('input[type="date"]').eq(1).should('have.value', '2026-09-01');
    cy.contains('button', 'Export CSV').should('be.enabled');

    cy.location('pathname').should('eq', '/admin/payments');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionValue);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.eq(null);
    });
    cy.then(() => expect(paymentsReads).to.eq(3));
  });
});
