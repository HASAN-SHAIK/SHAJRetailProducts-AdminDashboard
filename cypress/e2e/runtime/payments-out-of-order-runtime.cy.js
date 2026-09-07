describe('Cycle A Payments out-of-order response runtime', () => {
  it('keeps the newest selected Plan result when an older request completes later', () => {
    const token = 'cycle-a-payments-race-token';
    let reads = 0;

    cy.intercept('GET', '**/subscription-payments*', (req) => {
      reads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      const plan = new URL(req.url).searchParams.get('plan');

      if (reads === 1) {
        expect(plan).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { payments: [
          { id: 901, shop_name: 'Cycle A Initial Shop', plan_name: 'Basic', amount: '499.00', payment_method: 'CARD', paid_at: '2026-09-07T08:00:00.000Z', status: 'paid' }
        ] } } });
        return;
      }

      if (plan === 'basic') {
        req.reply({ delay: 1200, statusCode: 200, body: { data: { payments: [
          { id: 902, shop_name: 'Cycle A Slow Basic Shop', plan_name: 'Basic', amount: '499.00', payment_method: 'UPI', paid_at: '2026-09-07T09:00:00.000Z', status: 'paid' }
        ] } } });
        return;
      }

      expect(plan).to.eq('pro');
      req.reply({ statusCode: 200, body: { data: { payments: [
        { id: 903, shop_name: 'Cycle A Newest Pro Shop', plan_name: 'Pro', amount: '999.00', payment_method: 'CARD', paid_at: '2026-09-07T10:00:00.000Z', status: 'paid' }
      ] } } });
    }).as('paymentsRead');

    cy.visit('/admin/payments', { onBeforeLoad(win) {
      win.localStorage.setItem('shaj_admin_token', token);
      win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 7, name: 'Cycle A Admin', role: 'platform_admin' }));
    }});

    cy.wait('@paymentsRead');
    cy.contains('Cycle A Initial Shop').should('be.visible');

    cy.get('[role="combobox"]').last().click();
    cy.contains('[role="option"]', 'Basic').click();
    cy.get('[role="combobox"]').last().click();
    cy.contains('[role="option"]', 'Pro').click();

    cy.wait('@paymentsRead');
    cy.contains('Cycle A Newest Pro Shop').should('be.visible');
    cy.get('[role="combobox"]').last().should('contain.text', 'Pro');

    cy.wait('@paymentsRead');
    cy.wait(100);
    cy.contains('Cycle A Newest Pro Shop').should('be.visible');
    cy.contains('Cycle A Slow Basic Shop').should('not.exist');
    cy.get('[role="combobox"]').last().should('contain.text', 'Pro');
    cy.location('pathname').should('eq', '/admin/payments');
    cy.then(() => expect(reads).to.eq(3));
  });
});
