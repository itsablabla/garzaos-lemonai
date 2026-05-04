const request = require("supertest");
const sinon = require("sinon");
const { expect } = require("chai");

const app = require("../../../src/app"); // reference to your app instance in the project
const Platform = require("@src/models/Platform");
const Model = require("@src/models/Model");

describe("Platform Routes", () => {
  let server;

  before(() => {
    server = app.listen();
  });

  after(() => {
    server.close();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should create a platform", async () => {
    const mockData = { id: 1, name: "Test", logo_url: "http://logo", source_type: "user" };
    sinon.stub(Platform, "create").resolves(mockData);

    const res = await request(server)
      .post("/api/platform")
      .send({ name: "Test", logo_url: "http://logo", source_type: "user" });

    expect(res.status).to.equal(200);
    expect(res.body.data.name).to.equal("Test");
    expect(res.body.data.api_key).to.equal("");
    expect(res.body.data.api_key_set).to.equal(false);
  });

  it("should return list of platforms", async () => {
    sinon.stub(Platform, "findAll").resolves([{ id: 1, name: "Platform 1", api_key: "secret" }]);

    const res = await request(server).get("/api/platform");

    expect(res.status).to.equal(200);
    expect(res.body.data).to.be.an("array");
    expect(res.body.data[0].name).to.equal("Platform 1");
    expect(res.body.data[0].api_key).to.equal("");
    expect(res.body.data[0].api_key_set).to.equal(true);
  });

  it("should update a platform", async () => {
    const mockPlatform = {
      id: 1,
      update: sinon.stub().resolvesThis(),
    };
    sinon.stub(Platform, "findOne").resolves(mockPlatform);

    const res = await request(server)
      .put("/api/platform/1")
      .send({ api_key: "123", api_url: "http://api" });

    expect(res.status).to.equal(200);
    expect(mockPlatform.update.calledOnce).to.be.true;
    expect(mockPlatform.update.firstCall.args[0].api_key).to.equal("123");
    expect(res.body.data.api_key).to.equal("");
  });

  it("should not overwrite api_key with a blank value", async () => {
    const mockPlatform = {
      id: 1,
      api_key: "existing-key",
      update: sinon.stub().resolvesThis(),
    };
    sinon.stub(Platform, "findOne").resolves(mockPlatform);

    const res = await request(server)
      .put("/api/platform/1")
      .send({ api_key: "   ", api_url: "http://api", is_enabled: true });

    expect(res.status).to.equal(200);
    expect(mockPlatform.update.calledOnce).to.be.true;
    expect(mockPlatform.update.firstCall.args[0]).to.not.have.property("api_key");
    expect(mockPlatform.update.firstCall.args[0].api_url).to.equal("http://api");
    expect(res.body.data.api_key).to.equal("");
    expect(res.body.data.api_key_set).to.equal(true);
  });

  it("should not update if platform does not exist", async () => {
    sinon.stub(Platform, "findOne").resolves(null);

    const res = await request(server)
      .put("/api/platform/1")
      .send({ api_key: "123", api_url: "http://api" });

    expect(res.status).to.equal(200);
    expect(res.body.msg).to.equal("Platform does not exist");
  });

  it("should delete a platform", async () => {
    const mockPlatform = {
      id: 1,
      source_type: "user",
      destroy: sinon.stub().resolves(),
    };
    sinon.stub(Platform, "findOne").resolves(mockPlatform);
    sinon.stub(Model, "destroy").resolves();

    const res = await request(server).delete("/api/platform/1");

    expect(res.status).to.equal(200);
    expect(mockPlatform.destroy.calledOnce).to.be.true;
  });

  it("should not delete a system platform", async () => {
    const mockPlatform = {
      id: 1,
      source_type: "system",
    };
    sinon.stub(Platform, "findOne").resolves(mockPlatform);

    const res = await request(server).delete("/api/platform/1");

    expect(res.status).to.equal(200);
    expect(res.body.msg).to.equal("system platform cannot be deleted");
  });

  it("should not delete non-existent platform", async () => {
    sinon.stub(Platform, "findOne").resolves(null);

    const res = await request(server).delete("/api/platform/1");

    expect(res.status).to.equal(200);
    expect(res.body.msg).to.equal("Platform does not exist");
  });
});
