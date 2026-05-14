import axios from "axios";
import {
  DUMMY_AUCTIONS,
  DUMMY_BIDS,
  DUMMY_PORTFOLIO,
} from "../data/dummyData";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const USE_DUMMY = process.env.REACT_APP_USE_DUMMY === "true";

let mockBids = { ...DUMMY_BIDS };
let mockAuctions = [...DUMMY_AUCTIONS];
let bidIdCounter = 100;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Fix #7: intercept expired/invalid JWT and force logout — excludes /auth/ so bad
// login credentials still surface as errors rather than triggering a redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes("/auth/")) {
      localStorage.removeItem("user");
      localStorage.removeItem("authToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auctions
export const fetchAuctions = async (filter = {}) => {
  if (USE_DUMMY) {
    await delay(200);
    let auctions = [...mockAuctions];
    if (filter.type) auctions = auctions.filter((a) => a.type === filter.type);
    if (filter.status) auctions = auctions.filter((a) => a.status === filter.status);
    return { data: auctions };
  }
  return api.get("/auctions", { params: filter });
};

export const fetchAuctionById = async (id) => {
  if (USE_DUMMY) {
    await delay(150);
    const auction = mockAuctions.find((a) => a.id === Number(id));
    if (!auction) throw new Error("Auction not found");
    return { data: auction };
  }
  return api.get(`/auctions/${id}`);
};

export const createAuction = async (auctionData) => {
  if (USE_DUMMY) {
    await delay(300);
    const newAuction = {
      ...auctionData,
      id: mockAuctions.length + 1,
      status: "upcoming",
      currentHighestBid: parseFloat(auctionData.basePrice),
      highestBidder: null,
      remainingShares: parseInt(auctionData.totalShares),
      logo: auctionData.company[0].toUpperCase(),
    };
    mockAuctions.push(newAuction);
    mockBids[newAuction.id] = [];
    return { data: newAuction };
  }
  return api.post("/auctions", auctionData);
};

export const closeAuction = async (id) => {
  if (USE_DUMMY) {
    await delay(200);
    const idx = mockAuctions.findIndex((a) => a.id === Number(id));
    if (idx !== -1) mockAuctions[idx] = { ...mockAuctions[idx], status: "closed" };
    return { data: mockAuctions[idx] };
  }
  return api.patch(`/auctions/${id}/close`);
};

export const openAuction = async (id) => {
  if (USE_DUMMY) {
    await delay(200);
    const idx = mockAuctions.findIndex((a) => a.id === Number(id));
    if (idx !== -1) mockAuctions[idx] = { ...mockAuctions[idx], status: "open" };
    return { data: mockAuctions[idx] };
  }
  return api.patch(`/auctions/${id}/open`);
};

export const fetchTransactions = async () => {
  if (USE_DUMMY) {
    await delay(150);
    return { data: [] };
  }
  return api.get("/transactions");
};

// Fix #12: batch endpoint — single request for all bids grouped by auction
export const fetchAllBids = async () => {
  if (USE_DUMMY) {
    await delay(150);
    return { data: mockBids };
  }
  return api.get("/bids/all");
};

// Bids
export const fetchBids = async (auctionId) => {
  if (USE_DUMMY) {
    await delay(150);
    return { data: mockBids[auctionId] || [] };
  }
  return api.get("/bids", { params: { auctionId } });
};

export const placeBid = async (auctionId, bidData) => {
  if (USE_DUMMY) {
    await delay(300);
    const auction = mockAuctions.find((a) => a.id === Number(auctionId));
    if (!auction) throw new Error("Auction not found");
    if (auction.status !== "open") throw new Error("Auction is not open for bidding");
    if (bidData.price <= auction.currentHighestBid && auction.highestBidder !== null) {
      throw new Error(`Bid must exceed current highest of ₹${auction.currentHighestBid.toFixed(2)}`);
    }
    if (bidData.quantity > auction.remainingShares) {
      throw new Error(`Quantity exceeds available shares (${auction.remainingShares})`);
    }
    const newBid = {
      id: bidIdCounter++,
      auctionId: Number(auctionId),
      bidder: bidData.bidder,
      price: parseFloat(bidData.price),
      quantity: parseInt(bidData.quantity),
      time: new Date().toISOString(),
      status: "highest",
    };
    if (mockBids[auctionId]) {
      mockBids[auctionId] = mockBids[auctionId].map((b) =>
        b.status === "highest" ? { ...b, status: "outbid" } : b
      );
    } else {
      mockBids[auctionId] = [];
    }
    mockBids[auctionId].unshift(newBid);
    const idx = mockAuctions.findIndex((a) => a.id === Number(auctionId));
    mockAuctions[idx] = {
      ...mockAuctions[idx],
      currentHighestBid: newBid.price,
      highestBidder: newBid.bidder,
    };
    return { data: newBid };
  }
  return api.post("/bids", { auctionId, ...bidData });
};

// Portfolio
export const fetchPortfolio = async (userId) => {
  if (USE_DUMMY) {
    await delay(200);
    return { data: DUMMY_PORTFOLIO };
  }
  return api.get("/portfolio", { params: { userId } });
};

// Auth
export const loginUser = async (credentials) => {
  if (USE_DUMMY) {
    await delay(400);
    const { DUMMY_USERS } = await import("../data/dummyData");
    const user = DUMMY_USERS.find(
      (u) => u.username === credentials.username && u.password === credentials.password
    );
    if (!user) throw new Error("Invalid username or password");
    const token = `dummy-jwt-${user.id}-${Date.now()}`;
    return { data: { user, token } };
  }
  return api.post("/auth/login", credentials);
};

export const registerUser = async (userData) => {
  if (USE_DUMMY) {
    await delay(400);
    const newUser = { id: Date.now(), ...userData, role: "investor" };
    return { data: { user: newUser, token: `dummy-jwt-${newUser.id}-${Date.now()}` } };
  }
  return api.post("/auth/register", userData);
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export default api;
