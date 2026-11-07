import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../express-app.js";
import { updateTechnicianStatus } from "../modules/technicians/technicians.routes.js";

describe("Technician Approval & Live Nearest Customer Marketplace", () => {
  const app = createApp();

  it("handles technician registration, approval, and live display to nearest customers", async () => {
    // 1. Register a new technician
    const regRes = await request(app)
      .post("/api/v1/technicians/register")
      .send({
        businessName: "Kakinada Quick Plumbers",
        contactPerson: "K. Prasad Varma",
        categories: ["Plumber"],
        mobile: "9876543210",
        email: "prasad.varma@quickplumb.test",
        addressLine1: "Main Road, Karapa",
        city: "Kakinada Rural",
        state: "Andhra Pradesh",
        postalCode: "533462",
        latitude: 16.9900,
        longitude: 82.2480,
        chargePerHour: 300,
        chargePerDay: 1600
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.ok).toBe(true);
    const tech = regRes.body.data.technician;
    expect(tech.verificationStatus).toBe("PENDING");

    // 2. Prior to approval, verify they are filtered out of public marketplace
    const publicBefore = await request(app)
      .get("/api/v1/technicians?category=plumber&lat=16.9891&lng=82.2475");
    expect(publicBefore.status).toBe(200);
    const foundBefore = publicBefore.body.data.find((t: any) => t.partnerId === tech.partnerId);
    expect(foundBefore).toBeUndefined();

    // 3. Admin approves technician via identifier (matching partnerId or email or mobile)
    const approved = updateTechnicianStatus(
      { partnerId: tech.partnerId, email: tech.email, mobile: tech.mobile },
      "APPROVED"
    );
    expect(approved).not.toBeNull();
    expect(approved?.verificationStatus).toBe("APPROVED");

    // 4. Verify technician is now immediately returned in live marketplace sorted by nearest distance
    const publicAfter = await request(app)
      .get("/api/v1/technicians?lat=16.9891&lng=82.2475&sort=nearest");
    expect(publicAfter.status).toBe(200);
    expect(publicAfter.body.ok).toBe(true);

    const foundAfter = publicAfter.body.data.find((t: any) => t.partnerId === tech.partnerId);
    expect(foundAfter).toBeDefined();
    expect(foundAfter.name).toBe("K. Prasad Varma");
    expect(foundAfter.verificationStatus).toBe("APPROVED");
    expect(typeof foundAfter.distanceKm).toBe("number");
    // Since coords (16.9900, 82.2480) are ~0.1 km from customer (16.9891, 82.2475), they should be at or near the top
    expect(foundAfter.distanceKm).toBeLessThan(5);

    // 5. Customer books a plumbing service appointment
    const bookRes = await request(app)
      .post(`/api/v1/technicians/${tech.partnerId}/book`)
      .send({
        technicianId: tech.id,
        customerName: "G. Nagaraju",
        customerPhone: "9848999888",
        serviceCategory: "Plumber",
        bookingDate: "2026-11-08",
        timeSlot: "Morning (8:30 AM - 12:00 PM)",
        bookingType: "HOURLY",
        estimatedHours: 2,
        address: "Flat 402, Sai Residency, Main Road, Karapa",
        notes: "Emergency kitchen pipe leakage repair"
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.ok).toBe(true);
    const booking = bookRes.body.data.booking;
    expect(booking.customerName).toBe("G. Nagaraju");
    expect(booking.customerPhone).toBe("9848999888");
    expect(booking.address).toBe("Flat 402, Sai Residency, Main Road, Karapa");
    expect(booking.customerAddress).toBe("Flat 402, Sai Residency, Main Road, Karapa");
    expect(booking.estimatedTotal).toBe(600); // 300 * 2 hrs
    expect(booking.status).toBe("CONFIRMED");
    // Verify Service Request ID pattern: ET<CategoryCode><TechInitial><6Digits>
    // Plumber (P) + Prasad (P) -> ETPP...
    expect(booking.serviceRequestId).toBeDefined();
    expect(booking.serviceRequestId).toMatch(/^ET[A-Z]{2}\d{6}$/);
    expect(booking.serviceRequestId.startsWith("ETPP")).toBe(true);

    // 6. Verify technician can load the booking with complete customer details
    const { loadBookings, generateServiceRequestId } = await import("../modules/technicians/technicians.routes.js");
    const techBookings = await loadBookings(tech.partnerId);
    expect(techBookings.length).toBeGreaterThan(0);
    const foundBooking = techBookings.find((b: any) => b.customerPhone === "9848999888");
    expect(foundBooking).toBeDefined();
    expect(foundBooking?.customerName).toBe("G. Nagaraju");
    expect(foundBooking?.address).toBe("Flat 402, Sai Residency, Main Road, Karapa");
    expect(foundBooking?.serviceCategory).toBe("Plumber");
    expect(foundBooking?.serviceRequestId).toBeDefined();

    // 7. Verify automated ID generator pattern for various technicians and trades
    const sanjayPlumberId = generateServiceRequestId("Plumber", "Sanjay V");
    expect(sanjayPlumberId).toMatch(/^ETPS\d{6}$/);

    const rameshElectricianId = generateServiceRequestId("Electrician", "Ramesh Kumar");
    expect(rameshElectricianId).toMatch(/^ETER\d{6}$/);

    const masonId = generateServiceRequestId("Mason Worker", "Appa Rao");
    expect(masonId).toMatch(/^ETMA\d{6}$/);
  });
});

