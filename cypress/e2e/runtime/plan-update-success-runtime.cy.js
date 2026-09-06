describe("V1 Admin plan update success runtime", () => {
  it("converges the plan card to the authoritative successful PATCH response exactly once", () => {
    let plansReads = 0;
    let updateWrites = 0;

    cy.intercept({ method: "GET", pathname: "/plans" }, (req) => {
      plansReads += 1;
      expect(req.headers.authorization).to.eq("Bearer cycle-a-plan-success-token");
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
      expect(req.headers.authorization).to.eq("Bearer cycle-a-plan-success-token");
      expect(req.body).to.deep.eq({
        name: "basic",
        price: 699,
        duration_days: 45,
        is_active: false
      });
      req.reply({
        statusCode: 200,
        body: {
          plan: {
            id: 1,
            name: "basic",
            price: 699,
            duration_days: 45,
            is_active: false,
            features: { inventory: true, reports: false }
          }
        }
      });
    }).as("planUpdate");

    cy.visit("/admin/plans", {
      onBeforeLoad(win) {
        win.localStorage.setItem("shaj_admin_token", "cycle-a-plan-success-token");
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
    cy.contains("Active").should("be.visible");

    cy.contains("button", "Edit").click();
    cy.get('[role="dialog"]').should("be.visible").within(() => {
      cy.contains("Edit Plan").should("be.visible");
      cy.get('input[type="number"]').eq(0).type("{selectall}699");
      cy.get('input[type="number"]').eq(1).type("{selectall}45");
      cy.get('input[type="checkbox"]').uncheck({ force: true });
      cy.contains("button", "Save Changes").click();
    });

    cy.wait("@planUpdate").its("response.statusCode").should("eq", 200);
    cy.contains("Plan updated").should("be.visible");
    cy.get('[role="dialog"]').should("not.exist");

    cy.contains("₹699.00 / 45 days").should("be.visible");
    cy.contains("₹499.00 / 30 days").should("not.exist");
    cy.contains("Inactive").should("be.visible");
    cy.location("pathname").should("eq", "/admin/plans");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq("cycle-a-plan-success-token");
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(plansReads).to.eq(1);
      expect(updateWrites).to.eq(1);
    });
  });
});
