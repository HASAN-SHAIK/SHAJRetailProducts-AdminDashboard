describe('Cycle A Support Cases tenant-filter failure runtime', () => {
  const sessionValue = 'cycle-a-support-tenant-filter-failure-session';
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
                { id: 81, tenant_name: 'Cycle A Supermarket', title: 'Receipt printer alignment issue', category: 'printer', priority: 'high', status: 'open', assigned_to: 'Asha Admin', created_at: '2026-09-09T03:10:00.000Z', updated_at: '2026-09-09T03:15:00.000Z' },
                { id: 82, tenant_name: 'Cycle A Pharmacy', title: 'Scanner connection issue', category: 'scanner', priority: 'medium', status: 'in_progress', assigned_to: 'Ravi Admin', created_at: '2026-09-09T03:20:00.000Z', updated_at: '2026-09-09T03:25:00.000Z' }
              ]
            }
          }
        });
        return;
      }

      expect(req.query.tenant).to.eq('Cycle A Supermarket');
      expect(req.query.status).to.be.undefined;
      expect(req.query.priority).to.be.undefined;
      expect(req.query.category).to.be.undefined;
      req.reply({ statusCode: 500, body: { message: 'Support cases tenant filter unavailable' } });
    }).as('supportCasesBoundary');
  });

  it('surfaces a failed tenant-filter refetch without presenting stale unfiltered rows', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', sessionValue);
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' }));
      }
    });

    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Cycle A Supermarket').should('be.visible');
    cy.contains('Receipt printer alignment issue').should('be.visible');
    cy.contains('Cycle A Pharmacy').should('be.visible');
    cy.contains('Scanner connection issue').should('be.visible');

    cy.get('input[name="tenant"]').type('Cycle A Supermarket');
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 500);

    cy.contains('Support cases tenant filter unavailable').should('be.visible');
    cy.contains('Cycle A Supermarket').should('not.exist');
    cy.contains('Receipt printer alignment issue').should('not.exist');
    cy.contains('Cycle A Pharmacy').should('not.exist');
    cy.contains('Scanner connection issue').should('not.exist');
    cy.contains('button', 'View').should('not.exist');

    cy.get('input[name="tenant"]').should('have.value', 'Cycle A Supermarket');
    cy.get('input[name="status"]').should('have.value', 'all');
    cy.get('input[name="priority"]').should('have.value', 'all');
    cy.get('input[name="category"]').should('have.value', 'all');
    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionValue);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });
    cy.then(() => expect(listReads).to.eq(2));
  });
});
