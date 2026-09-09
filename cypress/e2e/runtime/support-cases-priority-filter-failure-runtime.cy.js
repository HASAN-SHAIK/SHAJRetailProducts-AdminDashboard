describe('Cycle A Support Cases priority-filter failure runtime', () => {
  const sessionValue = 'cycle-a-support-priority-filter-failure-session';
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
                { id: 61, tenant_name: 'Cycle A Grocery', title: 'Thermal printer queue issue', category: 'printer', priority: 'urgent', status: 'open', assigned_to: 'Asha Admin', created_at: '2026-09-09T01:10:00.000Z', updated_at: '2026-09-09T01:15:00.000Z' },
                { id: 62, tenant_name: 'Cycle A Medical', title: 'Scanner intermittently offline', category: 'scanner', priority: 'medium', status: 'in_progress', assigned_to: 'Ravi Admin', created_at: '2026-09-09T01:20:00.000Z', updated_at: '2026-09-09T01:25:00.000Z' }
              ]
            }
          }
        });
        return;
      }

      expect(req.query.priority).to.eq('urgent');
      expect(req.query.status).to.be.undefined;
      expect(req.query.category).to.be.undefined;
      expect(req.query.tenant).to.be.undefined;
      req.reply({ statusCode: 500, body: { message: 'Support cases priority filter unavailable' } });
    }).as('supportCasesBoundary');
  });

  it('surfaces a failed priority-filter refetch without presenting stale unfiltered rows', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', sessionValue);
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' }));
      }
    });

    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Cycle A Grocery').should('be.visible');
    cy.contains('Thermal printer queue issue').should('be.visible');
    cy.contains('Cycle A Medical').should('be.visible');
    cy.contains('Scanner intermittently offline').should('be.visible');

    cy.get('input[name="priority"]').parent().click();
    cy.get('[role="option"]').contains('urgent').click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 500);

    cy.contains('Support cases priority filter unavailable').should('be.visible');
    cy.contains('Cycle A Grocery').should('not.exist');
    cy.contains('Thermal printer queue issue').should('not.exist');
    cy.contains('Cycle A Medical').should('not.exist');
    cy.contains('Scanner intermittently offline').should('not.exist');
    cy.contains('button', 'View').should('not.exist');

    cy.get('input[name="priority"]').should('have.value', 'urgent');
    cy.get('input[name="status"]').should('have.value', 'all');
    cy.contains('Category').should('be.visible');
    cy.contains('Tenant').should('be.visible');
    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionValue);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });
    cy.then(() => expect(listReads).to.eq(2));
  });
});