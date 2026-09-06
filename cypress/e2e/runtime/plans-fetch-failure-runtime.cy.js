describe('Cycle A Plans fetch failure runtime', () => {
  const token = 'cycle-a-plans-fetch-failure-token';
  let plansReads = 0;

  beforeEach(() => {
    plansReads = 0;
    cy.intercept({ method: 'GET', url: '**' }, (req) => {
      const url = new URL(req.url);
      if (url.pathname === '/plans') {
        plansReads += 1;
        expect(req.headers.authorization).to.eq(`Bearer ${token}`);
        req.reply({
          statusCode: 500,
          body: { message: 'Plan service unavailable' }
        });
        return;
      }
      req.continue();
    }).as('plansBoundary');
  });

  it('surfaces the authoritative fetch error without losing session, route, or app health', () => {
    cy.visit('/admin/plans', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', token);
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' })
        );
      }
    });

    cy.wait('@plansBoundary').its('response.statusCode').should('eq', 500);
    cy.contains('Plan service unavailable').should('be.visible');
    cy.contains('Plans Management').should('not.exist');
    cy.contains('button', 'Edit').should('not.exist');

    cy.location('pathname').should('eq', '/admin/plans');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(token);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });
    cy.then(() => expect(plansReads).to.eq(1));
  });
});
