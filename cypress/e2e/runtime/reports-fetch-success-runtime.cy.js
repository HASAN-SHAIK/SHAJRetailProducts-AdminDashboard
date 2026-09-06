describe("V1 Admin reports fetch success runtime", () => {
  it("renders authoritative report series and tenant data without losing session or route", () => {
    let requestCount = 0;

    cy.intercept("GET", "**/globalreports*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq("Bearer cycle-a-reports-success-token");
      req.reply({
        statusCode: 200,
        body: {
          data: {
            revenueSeries: [
              { month: "Jan 2026", revenue: 125000 },
              { month: "Feb 2026", revenue: 148500 }
            ],
            topTenants: [
              { name: "Cycle A Market", revenue: 84500 },
              { name: "Cycle A Pharmacy", revenue: 64000 }
            ]
          }
        }
      });
    }).as("reportsRead");

    cy.visit("/admin/reports", {
      onBeforeLoad(win) {
        win.localStorage.setItem("shaj_admin_token", "cycle-a-reports-success-token");
        win.localStorage.setItem(
          "shaj_admin_profile",
          JSON.stringify({ id: 7, name: "Cycle A Admin", role: "platform_admin" })
        );
      }
    });

    cy.wait("@reportsRead").its("response.statusCode").should("eq", 200);
    cy.contains("Global Reports").should("be.visible");
    cy.contains("Revenue Over 6 Months").should("be.visible");
    cy.contains("Top 10 Tenants").should("be.visible");

    // Recharts renders authoritative labels as SVG text. Assert the rendered SVG
    // content and chart geometry directly instead of Cypress's HTML-oriented
    // `be.visible` heuristic for SVG text nodes.
    cy.get(".recharts-line-chart").should("exist");
    cy.get(".recharts-line-curve").should("exist");
    cy.get(".recharts-line-chart .recharts-xAxis .recharts-cartesian-axis-tick-value")
      .then(($ticks) => [...$ticks].map((tick) => tick.textContent?.trim()))
      .should("include.members", ["Jan 2026", "Feb 2026"]);

    cy.get(".recharts-bar-chart").should("exist");
    cy.get(".recharts-bar-rectangle").should("have.length.at.least", 2);
    cy.get(".recharts-bar-chart .recharts-yAxis .recharts-cartesian-axis-tick-value")
      .then(($ticks) => [...$ticks].map((tick) => tick.textContent?.trim()))
      .should("include.members", ["Cycle A Market", "Cycle A Pharmacy"]);

    cy.location("pathname").should("eq", "/admin/reports");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq(
        "cycle-a-reports-success-token"
      );
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(1);
    });
  });
});
