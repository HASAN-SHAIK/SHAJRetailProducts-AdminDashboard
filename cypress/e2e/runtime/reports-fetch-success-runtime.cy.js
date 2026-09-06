describe("V1 Admin reports fetch success runtime", () => {
  afterEach(() => {
    cy.document().then((doc) => {
      const wrappers = [...doc.querySelectorAll(".recharts-wrapper")].map((wrapper, index) => ({
        index,
        text: wrapper.textContent,
        html: wrapper.outerHTML
      }));
      cy.writeFile("cypress/evidence/reports-fetch-success-dom.json", {
        pathname: doc.location.pathname,
        bodyText: doc.body?.innerText || "",
        wrapperCount: wrappers.length,
        wrappers
      });
    });
  });

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

    // Verify the rendered chart output itself without depending on Recharts'
    // generated wrapper ids. Each chart must have real geometry and its SVG
    // labels must contain the authoritative server values.
    cy.get(".recharts-wrapper").should("have.length.at.least", 2);

    cy.get(".recharts-wrapper")
      .eq(0)
      .within(() => {
        cy.get(".recharts-line-curve")
          .should("exist")
          .and("have.attr", "d")
          .and("not.be.empty");
        cy.get("svg").should(($svg) => {
          const text = $svg.text();
          expect(text).to.contain("Jan 2026");
          expect(text).to.contain("Feb 2026");
        });
      });

    cy.get(".recharts-wrapper")
      .eq(1)
      .within(() => {
        cy.get(".recharts-bar-rectangle").should("have.length.at.least", 2);
        cy.get('.recharts-bar-rectangle path[name="Cycle A Market"]').should("exist");
        cy.get('.recharts-bar-rectangle path[name="Cycle A Pharmacy"]').should("exist");
        cy.get(".recharts-cartesian-axis-tick-value").should(($ticks) => {
          const labels = [...$ticks].map((tick) =>
            [...tick.querySelectorAll("tspan")]
              .map((part) => part.textContent.trim())
              .filter(Boolean)
              .join(" ")
          );
          expect(labels).to.include("Cycle A Market");
          expect(labels).to.include("Cycle A Pharmacy");
        });
      });

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
