describe('Cycle A Payments CSV export runtime', () => {
  const sessionValue = 'cycle-a-payments-csv-token';
  const exportTimestamp = 1788760000000;
  let paymentsReads = 0;

  beforeEach(() => {
    paymentsReads = 0;
    cy.intercept('GET', '**/subscription-payments*', (req) => {
      paymentsReads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${sessionValue}`);
      req.reply({
        statusCode: 200,
        body: {
          data: {
            payments: [
              {
                id: 701,
                shop_name: 'Cycle A "Quoted" Market',
                plan_name: 'Pro',
                amount: '999.50',
                payment_method: 'UPI',
                paid_at: '2026-09-07T04:00:00.000Z',
                status: 'paid'
              },
              {
                id: 702,
                shop_name: 'Cycle A Pharmacy',
                plan_name: 'Basic',
                amount: '499.00',
                payment_method: 'CARD',
                paid_at: '2026-09-07T04:10:00.000Z',
                status: 'paid'
              }
            ]
          }
        }
      });
    }).as('paymentsBoundary');
  });

  it('downloads the authoritative rendered payment rows as escaped CSV and retains session/runtime health', () => {
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
    cy.contains('Cycle A "Quoted" Market').should('be.visible');
    cy.contains('Cycle A Pharmacy').should('be.visible');

    cy.window().then((win) => {
      cy.stub(win.Date, 'now').returns(exportTimestamp);
    });
    cy.contains('button', 'Export CSV').should('be.enabled').click();
    cy.contains('CSV exported successfully').should('be.visible');

    const downloadPath = `cypress/downloads/subscription_payments_${exportTimestamp}.csv`;
    cy.readFile(downloadPath, { timeout: 10000 }).then((csv) => {
      expect(csv).to.include('Payment ID,Tenant,Plan,Amount,Method,Paid At,Status');
      expect(csv).to.include('"701","Cycle A ""Quoted"" Market","Pro","999.5","UPI"');
      expect(csv).to.include('"702","Cycle A Pharmacy","Basic","499","CARD"');
      expect(csv).to.include('"paid"');
    });

    cy.location('pathname').should('eq', '/admin/payments');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionValue);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.eq(null);
    });
    cy.then(() => expect(paymentsReads).to.eq(1));
  });
});
