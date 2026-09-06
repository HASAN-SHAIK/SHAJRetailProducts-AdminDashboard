describe("V1 Admin plan update failure runtime", () => {
  it("keeps failed plan edits retryable without false success or local mutation", () => {
    let plansReads = 0;
    let updateWrites = 0;

    cy.intercept({ method: "GET", pathname: "/plans" }, (req) => {
      plansReads += 1;
      expect(req.headers.authorization).to.eq("Bearer cycle-a-plan-failure-token");
      req.reply({
        statusCode: 200,
        body: {
          data: {
            plans: [
              {
                id: 1,
                name: "basic",
                price: 499,
                duration_days: 30,
                is_active: true,
                features: { inventory: true, reports: false }
              }
            ]
          }
        }
      });
    }).as("plansRead");

    cy.intercept({ method: "PATCH", pathname: "/plans/1" }, (req) => {
      updateWrites += 1;
      expect(req.headers.authorization).to.eq("Bearer cycle-a-plan-failure-token");
      expect(req.body).to.deep.eq({
        name: "basic",
        price: 699,
        duration_days: 30,
        is_active: true
      });
      req.reply({
        statusCode: 500,
        body: { message: "Plan service unavailable" }
      });
    }).as("planUpdate");

    cy.visit("/admin/plans", {
      onBeforeLoad(win) {
        win.localStorage.setItem("shaj_admin_token", "cycle-a-plan-failure-token");
        win.localStorage.setItem(
          "shaj_admin_profile",
          JSON.stringify({ id: 7, name: "Cycle A Admin", role: "platform_admin" })
        );
      }
    });

    cy.wait("@plansRead").its("response.statusCode").should("eq", 200);
    cy.contains("Plans Management").should("be.visible");
    cy.contains("Basic").should("be.visible");
    cy.contains("₹499.00 / 30 days").should("be.visible");

    cy.contains("button", "Edit").click();
    cy.get('[role="dialog"]').should("be.visible").within(() => {
      cy.contains("Edit Plan").should("be.visible");
      cy.get('input[type="number"]').eq(0).clear().type("699");
      cy.contains("button", "Save Changes").click();
    });

    cy.wait("@planUpdate").its("response.statusCode").should("eq", 500);

    // A rejected privileged update must remain visibly failed and retryable.
    cy.contains("Plan service unavailable").should("be.visible");
    cy.contains("Plan updated").should("not.exist");
    cy.get('[role="dialog"]').should("be.visible").within(() => {
      cy.get('input[type="number"]').eq(0).should("have.value", "699");
      cy.contains("button", "Save Changes").should("be.enabled");
    });

    // Persisted authoritative card state must remain unchanged after rejection.
    cy.contains("₹499.00 / 30 days").should("be.visible");
    cy.contains("₹699.00 / 30 days").should("not.exist");
    cy.location("pathname").should("eq", "/admin/plans");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq("cycle-a-plan-failure-token");
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(plansReads).to.eq(1);
      expect(updateWrites).to.eq(1);
    });
  });
});
