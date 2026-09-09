describe('Cycle A Support Cases category-filter failure runtime', () => {
  const sessionValue = 'cycle-a-support-category-filter-failure-session';
  let listReads = 0;

  beforeEach(() => {
    listReads = 0;
    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      listReads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${sessionValue}`);
      expect(req.query.page).to.eq('1');
      expect(req.query.pageSize).to.eq('10');

      if (listReads === 1) {
        expect(req.query.status).to.be.undefined;
        expect(req.query.priority).to.be.undefined;
        expect(req.query.category).to.be.undefined;
        expect(req.query.tenant).to.be.undefined;
        req.reply({
          statusCode: 200,
          body: {
            data: {
              page: 1,
              pageSize: 10,
              total: 2,
              cases: [
                { id: 71, tenant_name: 'Cycle A Fashion', title: 'Receipt printer paper cut issue', category: 'printer', priority: 'high', status: 'open', assigned_to: 'Asha Admin', created_at: '2026-09-09T02:10:00.000Z', updated_at: '2026-09-09T02:15:00.000Z' },
                { id: 72, tenant_name: 'Cycle A Pharmacy', title: 'Scanner pairing issue', category: 'scanner', priority: 'medium', status: 'in_progress', assigned_to: 'Ravi Admin', created_at: '2026-09-09T02:20:00.000Z', updated_at: '2026-09-09T02:25:00.000Z' }
              ]
            }
          }
        });
        return;
      }

      expect(req.query.category).to.eq('printer');
      expect(req.query.status).to.be.undefined;
      expect(req.query.priority).to.be.undefined;
      expect(req.query.tenant).to.be.undefined;
      req.reply({ statusCode: 500, body: { message: 'Support cases category filter unavailable' } });
    }).as('supportCasesBoundary');
  });

  it('surfaces a failed category-filter refetch without presenting stale unfiltered rows', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', sessionValue);
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' }));
      }
    });

    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Cycle A Fashion').should('be.visible');
    cy.contains('Receipt printer paper cut issue').should('be.visible');
    cy.contains('Cycle A Pharmacy').should('be.visible');
    cy.contains('Scanner pairing issue').should('be.visible');

    cy.get('input[name="category"]').parent().click();
    cy.get('[role="option"]').contains('printer').click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 500);

    cy.contains('Support cases category filter unavailable').should('be.visible');
    cy.contains('Cycle A Fashion').should('not.exist');
    cy.contains('Receipt printer paper cut issue').should('not.exist');
    cy.contains('Cycle A Pharmacy').should('not.exist');
    cy.contains('Scanner pairing issue').should('not.exist');
    cy.contains('button', 'View').should('not.exist');

    cy.get('input[name="category"]').should('have.value', 'printer');
    cy.get('input[name="status"]').should('have.value', 'all');
    cy.get('input[name="priority"]').should('have.value', 'all');
    cy.get('input[name="tenant"]').should('have.value', '');
    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionValue);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });
    cy.then(() => expect(listReads).to.eq(2));
  });
});