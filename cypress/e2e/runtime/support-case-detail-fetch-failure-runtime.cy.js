describe('Cycle A Support Case Detail fetch-failure runtime', () => {
  const token = 'cycle-a-support-detail-failure-token';
  let detailReads = 0;

  beforeEach(() => {
    detailReads = 0;
    cy.intercept({ method: 'GET', pathname: '/support/cases/42' }, (req) => {
      detailReads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      req.reply({
        statusCode: 500,
        body: { message: 'Support case detail unavailable' }
      });
    }).as('supportCaseDetailBoundary');
  });

  it('surfaces the authoritative detail error without exposing stale case actions or losing session/route', () => {
    cy.visit('/admin/support-cases/42', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', token);
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' })
        );
      }
    });

    cy.wait('@supportCaseDetailBoundary').its('response.statusCode').should('eq', 500);

    cy.contains('Support case detail unavailable').should('be.visible');
    cy.contains('Change Status').should('not.exist');
    cy.contains('Change Priority').should('not.exist');
    cy.contains('Assign Admin').should('not.exist');
    cy.contains('Send Reply').should('not.exist');
    cy.contains('Case Details').should('not.exist');
    cy.contains('Messages').should('not.exist');

    cy.location('pathname').should('eq', '/admin/support-cases/42');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(token);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(detailReads).to.eq(1);
    });
  });
});
