describe("V1 Admin payments filter success runtime", () => {
  it("renders authoritative payments and refetches when the Plan filter changes", () => {
    let requestCount = 0;

    cy.intercept("GET", "**/subscription-payments*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq("Bearer cycle-a-payments-success-token");

      const plan = new URL(req.url).searchParams.get("plan");
      if (requestCount === 1) {
        expect(plan).to.eq(null);
        req.reply({
          statusCode: 200,
          body: {
            data: {
              payments: [
                {
                  id: 301,
                  shop_name: "Cycle A Basic Shop",
                  plan_name: "Basic",
                  amount: "499.00",
                  payment_method: "UPI",
                  paid_at: "2026-09-05T12:00:00.000Z",
                  status: "paid"
                },
                {
                  id: 302,
                  shop_name: "Cycle A Pro Shop",
                  plan_name: "Pro",
                  amount: "999.00",
                  payment_method: "CARD",
                  paid_at: "2026-09-05T13:00:00.000Z",
                  status: "paid"
                }
              ]
            }
          }
        });
        return;
      }

      expect(requestCount).to.eq(2);
      expect(plan).to.eq("pro");
      req.reply({
        statusCode: 200,
        body: {
          data: {
            payments: [
              {
                id: 302,
                shop_name: "Cycle A Pro Shop",
                plan_name: "Pro",
                amount: "999.00",
                payment_method: "CARD",
                paid_at: "2026-09-05T13:00:00.000Z",
                status: "paid"
              }
            ]
          }
        }
      });
    }).as("paymentsRead");

    cy.visit("/admin/payments", {
      onBeforeLoad(win) {
        win.localStorage.setItem("shaj_admin_token", "cycle-a-payments-success-token");
        win.localStorage.setItem(
          "shaj_admin_profile",
          JSON.stringify({ id: 7, name: "Cycle A Admin", role: "platform_admin" })
        );
      }
    });

    cy.wait("@paymentsRead").its("response.statusCode").should("eq", 200);
    cy.contains("h4", "Payments").should("be.visible");
    cy.contains("Cycle A Basic Shop").should("be.visible");
    cy.contains("Cycle A Pro Shop").should("be.visible");
    cy.contains("button", "Export CSV").should("be.visible").and("be.enabled");

    cy.get('[role="combobox"]').last().click();
    cy.contains('[role="option"]', "Pro").click();

    cy.wait("@paymentsRead").its("response.statusCode").should("eq", 200);
    cy.contains("Cycle A Pro Shop").should("be.visible");
    cy.contains("Cycle A Basic Shop").should("not.exist");
    cy.location("pathname").should("eq", "/admin/payments");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq(
        "cycle-a-payments-success-token"
      );
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(2);
    });
  });
});
