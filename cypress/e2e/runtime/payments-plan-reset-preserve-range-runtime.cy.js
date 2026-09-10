describe('Cycle A Payments Plan reset preserves active date range runtime', () => {
  const sessionValue = 'cycle-a-payments-plan-reset-preserve-range-token';
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
        req.reply({ statusCode: 200, body: { data: { payments: [
          { id: 1021, shop_name: 'Cycle A Before Range Basic Shop', plan_name: 'Basic', amount: '499.00', payment_method: 'UPI', paid_at: '2026-08-28T10:00:00.000Z', status: 'paid' },
          { id: 1022, shop_name: 'Cycle A In Range Basic Shop', plan_name: 'Basic', amount: '499.00', payment_method: 'CARD', paid_at: '2026-09-02T10:00:00.000Z', status: 'paid' },
          { id: 1023, shop_name: 'Cycle A In Range Pro Shop', plan_name: 'Pro', amount: '999.00', payment_method: 'UPI', paid_at: '2026-09-03T10:00:00.000Z', status: 'paid' },
          { id: 1024, shop_name: 'Cycle A After Range Pro Shop', plan_name: 'Pro', amount: '999.00', payment_method: 'CARD', paid_at: '2026-09-08T10:00:00.000Z', status: 'paid' }
        ] } } });
        return;
      }

      if (paymentsReads === 2) {
        expect(from).to.eq('2026-09-01');
        expect(to).to.eq(null);
        expect(plan).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { payments: [
          { id: 1022, shop_name: 'Cycle A In Range Basic Shop', plan_name: 'Basic', amount: '499.00', payment_method: 'CARD', paid_at: '2026-09-02T10:00:00.000Z', status: 'paid' },
          { id: 1023, shop_name: 'Cycle A In Range Pro Shop', plan_name: 'Pro', amount: '999.00', payment_method: 'UPI', paid_at: '2026-09-03T10:00:00.000Z', status: 'paid' },
          { id: 1024, shop_name: 'Cycle A After Range Pro Shop', plan_name: 'Pro', amount: '999.00', payment_method: 'CARD', paid_at: '2026-09-08T10:00:00.000Z', status: 'paid' }
        ] } } });
        return;
      }

      if (paymentsReads === 3) {
        expect(from).to.eq('2026-09-01');
        expect(to).to.eq('2026-09-04');
        expect(plan).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { payments: [
          { id: 1022, shop_name: 'Cycle A In Range Basic Shop', plan_name: 'Basic', amount: '499.00', payment_method: 'CARD', paid_at: '2026-09-02T10:00:00.000Z', status: 'paid' },
          { id: 1023, shop_name: 'Cycle A In Range Pro Shop', plan_name: 'Pro', amount: '999.00', payment_method: 'UPI', paid_at: '2026-09-03T10:00:00.000Z', status: 'paid' }
        ] } } });
        return;
      }

      if (paymentsReads === 4) {
        expect(from).to.eq('2026-09-01');
        expect(to).to.eq('2026-09-04');
        expect(plan).to.eq('pro');
        req.reply({ statusCode: 200, body: { data: { payments: [
          { id: 1023, shop_name: 'Cycle A In Range Pro Shop', plan_name: 'Pro', amount: '999.00', payment_method: 'UPI', paid_at: '2026-09-03T10:00:00.000Z', status: 'paid' }
        ] } } });
        return;
      }

      expect(paymentsReads).to.eq(5);
      expect(from).to.eq('2026-09-01');
      expect(to).to.eq('2026-09-04');
      expect(plan).to.eq(null);
      req.reply({ statusCode: 200, body: { data: { payments: [
        { id: 1022, shop_name: 'Cycle A In Range Basic Shop', plan_name: 'Basic', amount: '499.00', payment_method: 'CARD', paid_at: '2026-09-02T10:00:00.000Z', status: 'paid' },
        { id: 1023, shop_name: 'Cycle A In Range Pro Shop', plan_name: 'Pro', amount: '999.00', payment_method: 'UPI', paid_at: '2026-09-03T10:00:00.000Z', status: 'paid' }
      ] } } });
    }).as('paymentsBoundary');
  });

  it('resets Plan to All while preserving From and To and converging to authoritative date-range rows', () => {
    cy.visit('/admin/payments', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', sessionValue);
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 7, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' })
        );
      }
    });

    cy.wait('@paymentsBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Cycle A Before Range Basic Shop').should('be.visible');
    cy.contains('Cycle A In Range Basic Shop').should('be.visible');
    cy.contains('Cycle A In Range Pro Shop').should('be.visible');
    cy.contains('Cycle A After Range Pro Shop').should('be.visible');

    cy.get('input[type="date"]').eq(0).type('2026-09-01');
    cy.wait('@paymentsBoundary').its('response.statusCode').should('eq', 200);

    cy.get('input[type="date"]').eq(1).type('2026-09-04');
    cy.wait('@paymentsBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Cycle A Before Range Basic Shop').should('not.exist');
    cy.contains('Cycle A After Range Pro Shop').should('not.exist');
    cy.contains('Cycle A In Range Basic Shop').should('be.visible');
    cy.contains('Cycle A In Range Pro Shop').should('be.visible');

    cy.get('[role="combobox"]').last().click();
    cy.contains('[role="option"]', 'Pro').click();
    cy.wait('@paymentsBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Cycle A In Range Basic Shop').should('not.exist');
    cy.contains('Cycle A In Range Pro Shop').should('be.visible');

    cy.get('[role="combobox"]').last().click();
    cy.contains('[role="option"]', 'All').click();
    cy.wait('@paymentsBoundary').its('response.statusCode').should('eq', 200);

    cy.get('input[type="date"]').eq(0).should('have.value', '2026-09-01');
    cy.get('input[type="date"]').eq(1).should('have.value', '2026-09-04');
    cy.get('[role="combobox"]').last().should('contain.text', 'All');
    cy.contains('Cycle A Before Range Basic Shop').should('not.exist');
    cy.contains('Cycle A After Range Pro Shop').should('not.exist');
    cy.contains('Cycle A In Range Basic Shop').should('be.visible');
    cy.contains('Cycle A In Range Pro Shop').should('be.visible');
    cy.contains('button', 'Export CSV').should('be.enabled');
    cy.location('pathname').should('eq', '/admin/payments');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionValue);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(paymentsReads).to.eq(5);
    });
  });
});