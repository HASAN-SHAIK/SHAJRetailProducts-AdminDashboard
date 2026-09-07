describe('Cycle A Activity Logs out-of-order response runtime', () => {
  it('keeps the newest filter result when an older request completes later', () => {
    const token = 'cycle-a-activity-logs-race-token';
    let reads = 0;

    cy.intercept('GET', '**/activity-logs*', (req) => {
      reads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      const url = new URL(req.url);
      const admin = url.searchParams.get('admin');
      const action = url.searchParams.get('action');

      if (reads === 1) {
        expect(admin).to.eq(null);
        expect(action).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { logs: [
          { id: 1001, admin_email: 'slow@shaj.test', action: 'tenant.view', entity_type: 'tenant', entity_id: 11, metadata: {}, created_at: '2026-09-07T08:00:00.000Z' },
          { id: 1002, admin_email: 'other@shaj.test', action: 'tenant.update', entity_type: 'tenant', entity_id: 12, metadata: {}, created_at: '2026-09-07T08:05:00.000Z' }
        ] } } });
        return;
      }

      if (admin === 'slow@shaj.test' && action === null) {
        req.reply({ delay: 1200, statusCode: 200, body: { data: { logs: [
          { id: 1003, admin_email: 'slow@shaj.test', action: 'tenant.view', entity_type: 'tenant', entity_id: 13, metadata: {}, created_at: '2026-09-07T09:00:00.000Z' }
        ] } } });
        return;
      }

      expect(admin).to.eq('slow@shaj.test');
      expect(action).to.eq('tenant.update');
      req.reply({ statusCode: 200, body: { data: { logs: [
        { id: 1004, admin_email: 'slow@shaj.test', action: 'tenant.update', entity_type: 'tenant', entity_id: 14, metadata: { source: 'newest-filter' }, created_at: '2026-09-07T10:00:00.000Z' }
      ] } } });
    }).as('logsRead');

    cy.visit('/admin/logs', { onBeforeLoad(win) {
      win.localStorage.setItem('shaj_admin_token', token);
      win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 7, name: 'Cycle A Admin', role: 'platform_admin' }));
    }});

    cy.wait('@logsRead');
    cy.contains('other@shaj.test').should('be.visible');

    cy.get('[role="combobox"]').eq(0).click();
    cy.contains('[role="option"]', 'slow@shaj.test').click();
    cy.get('[role="combobox"]').eq(1).click();
    cy.contains('[role="option"]', 'tenant.update').click();

    cy.wait('@logsRead');
    cy.contains('1004').should('be.visible');
    cy.contains('newest-filter').should('be.visible');

    cy.wait('@logsRead');
    cy.wait(100);
    cy.contains('1004').should('be.visible');
    cy.contains('1003').should('not.exist');
    cy.get('[role="combobox"]').eq(0).should('contain.text', 'slow@shaj.test');
    cy.get('[role="combobox"]').eq(1).should('contain.text', 'tenant.update');
    cy.location('pathname').should('eq', '/admin/logs');
    cy.window().then((win) => expect(win.localStorage.getItem('shaj_admin_token')).to.eq(token));
    cy.then(() => expect(reads).to.eq(3));
  });
});
