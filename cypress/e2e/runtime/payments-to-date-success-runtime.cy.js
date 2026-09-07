describe('Cycle A Payments To-date success runtime', () => {
  const sessionValue = 'cycle-a-payments-to-date-token';
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
                  id: 811,
                  shop_name: 'Cycle A Early September Shop',
                  plan_name: 'Basic',
                  amount: '499.00',
                  payment_method: 'CARD',
                  paid_at: '2026-09-03T10:00:00.000Z',
                  status: 'paid'
                },
                {
                  id: 812,
                  shop_name: 'Cycle A Late September Shop',
                  plan_name: 'Pro',
                  amount: '999.00',
                  payment_method: 'UPI',
                  paid_at: '2026-09-06T10:00:00.000Z',
                  status: 'paid'
                }
              ]
            }
          }
        });
        return;
      }

      expect(paymentsReads).to.eq(2);
      expect(from).to.eq(null);
      expect(to).to.eq('2026-09-04');
      expect(plan).to.eq(null);
      req.reply({
        statusCode: 200,
        body: {
          data: {
            payments: [
              {
                id: 811,
                shop_name: 'Cycle A Early September Shop',
                plan_name: 'Basic',
                amount: '499.00',
                payment_method: 'CARD',
                paid_at: '2026-09-03T10:00:00.000Z',
                status: 'paid'
              }
            ]
          }
        }
      });
    }).as('paymentsBoundary');
  });

  it('refetches with the selected To date and converges to the authoritative filtered response', () => {
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
    cy.contains('Cycle A Early September Shop').should('be.visible');
    cy.contains('Cycle A Late September Shop').should('be.visible');

    cy.get('input[type="date"]').eq(1).should('have.value', '').type('2026-09-04');
    cy.wait('@paymentsBoundary').its('response.statusCode').should('eq', 200);

    cy.get('input[type="date"]').eq(0).should('have.value', '');
    cy.get('input[type="date"]').eq(1).should('have.value', '2026-09-04');
    cy.contains('Cycle A Early September Shop').should('be.visible');
    cy.contains('Cycle A Late September Shop').should('not.exist');
    cy.contains('button', 'Export CSV').should('be.enabled');

    cy.location('pathname').should('eq', '/admin/payments');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionValue);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.eq(null);
    });
    cy.then(() => expect(paymentsReads).to.eq(2));
  });
});