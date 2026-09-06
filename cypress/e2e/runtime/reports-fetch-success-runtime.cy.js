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
    cy.contains("Jan 2026").should("be.visible");
    cy.contains("Feb 2026").should("be.visible");
    cy.contains("Cycle A Market").should("be.visible");
    cy.contains("Cycle A Pharmacy").should("be.visible");
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
