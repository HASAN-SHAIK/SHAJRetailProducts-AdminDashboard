describe('Cycle A Payments filter failure runtime', () => {
  const sessionValue = 'cycle-a-payments-filter-failure-token';
  let paymentsReads = 0;

  beforeEach(() => {
    paymentsReads = 0;
    cy.intercept('GET', '**/subscription-payments*', (req) => {
      paymentsReads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${sessionValue}`);
      const plan = new URL(req.url).searchParams.get('plan');

      if (paymentsReads === 1) {
        expect(plan).to.eq(null);
        req.reply({
          statusCode: 200,
          body: {
            data: {
              payments: [
                {
                  id: 501,
                  shop_name: 'Cycle A Basic Shop',
                  plan_name: 'Basic',
                  amount: '499.00',
                  payment_method: 'UPI',
                  paid_at: '2026-09-07T04:00:00.000Z',
                  status: 'paid'
                },
                {
                  id: 502,
                  shop_name: 'Cycle A Pro Shop',
                  plan_name: 'Pro',
                  amount: '999.00',
                  payment_method: 'CARD',
                  paid_at: '2026-09-07T04:10:00.000Z',
                  status: 'paid'
                }
              ]
            }
          }
        });
        return;
      }

      expect(paymentsReads).to.eq(2);
      expect(plan).to.eq('pro');
      req.reply({
        statusCode: 500,
        body: { message: 'Payment filter service unavailable' }
      });
    }).as('paymentsBoundary');
  });

  it('preserves last-known authoritative payment rows when a filter refetch fails', () => {
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
    cy.contains('Cycle A Basic Shop').should('be.visible');
    cy.contains('Cycle A Pro Shop').should('be.visible');
    cy.contains('button', 'Export CSV').should('be.visible').and('be.enabled');

    cy.get('[role="combobox"]').last().click();
    cy.contains('[role="option"]', 'Pro').click();
    cy.wait('@paymentsBoundary').its('response.statusCode').should('eq', 500);

    cy.contains('Payment filter service unavailable').should('be.visible');
    cy.contains('Cycle A Basic Shop').should('be.visible');
    cy.contains('Cycle A Pro Shop').should('be.visible');
    cy.contains('button', 'Export CSV').should('be.visible').and('be.enabled');
    cy.contains('From').should('be.visible');
    cy.contains('To').should('be.visible');
    cy.contains('Plan').should('be.visible');
    cy.location('pathname').should('eq', '/admin/payments');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionValue);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.eq(null);
    });
    cy.then(() => expect(paymentsReads).to.eq(2));
  });
});
