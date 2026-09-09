describe('Cycle A Support Cases status-filter failure runtime', () => {
  const sessionValue = 'cycle-a-support-list-filter-failure-session';
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
        req.reply({
          statusCode: 200,
          body: {
            data: {
              page: 1,
              pageSize: 10,
              total: 2,
              cases: [
                { id: 51, tenant_name: 'Cycle A Market', title: 'Receipt printer issue', category: 'printer', priority: 'high', status: 'open', assigned_to: 'Asha Admin', created_at: '2026-09-09T00:30:00.000Z', updated_at: '2026-09-09T00:35:00.000Z' },
                { id: 52, tenant_name: 'Cycle A Pharmacy', title: 'Barcode scanner issue', category: 'scanner', priority: 'medium', status: 'in_progress', assigned_to: 'Ravi Admin', created_at: '2026-09-09T00:40:00.000Z', updated_at: '2026-09-09T00:45:00.000Z' }
              ]
            }
          }
        });
        return;
      }

      expect(req.query.status).to.eq('open');
      expect(req.query.priority).to.be.undefined;
      expect(req.query.category).to.be.undefined;
      expect(req.query.tenant).to.be.undefined;
      req.reply({ statusCode: 500, body: { message: 'Support cases status filter unavailable' } });
    }).as('supportCasesBoundary');
  });

  it('surfaces a failed status-filter refetch without presenting stale unfiltered rows', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', sessionValue);
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' }));
      }
    });

    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Cycle A Market').should('be.visible');
    cy.contains('Receipt printer issue').should('be.visible');
    cy.contains('Cycle A Pharmacy').should('be.visible');
    cy.contains('Barcode scanner issue').should('be.visible');

    cy.get('input[name="status"]').parent().click();
    cy.get('[role="option"]').contains('open').click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 500);

    cy.contains('Support cases status filter unavailable').should('be.visible');
    cy.contains('Cycle A Market').should('not.exist');
    cy.contains('Receipt printer issue').should('not.exist');
    cy.contains('Cycle A Pharmacy').should('not.exist');
    cy.contains('Barcode scanner issue').should('not.exist');
    cy.contains('button', 'View').should('not.exist');

    cy.get('input[name="status"]').should('have.value', 'open');
    cy.contains('Priority').should('be.visible');
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