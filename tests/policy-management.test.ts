import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockClarity = {
  tx: {
    sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  },
  block: {
    height: 100,
  },
};

// Mock implementation of the policy-management contract
const policyManagement = {
  admin: mockClarity.tx.sender,
  policies: new Map(),
  policyCounter: 0,
  
  isAdmin() {
    return mockClarity.tx.sender === this.admin;
  },
  
  createPolicy(owner, coverageAmount, premium, startDate, endDate, policyType) {
    if (!this.isAdmin()) {
      return { err: 403 };
    }
    
    if (endDate <= startDate || coverageAmount <= 0) {
      return { err: 400 };
    }
    
    const policyId = ++this.policyCounter;
    this.policies.set(policyId, {
      owner,
      coverageAmount,
      premium,
      startDate,
      endDate,
      active: true,
      policyType,
    });
    
    return { ok: policyId };
  },
  
  getPolicy(policyId) {
    return this.policies.get(policyId) || null;
  },
  
  updatePolicyStatus(policyId, active) {
    if (!this.isAdmin()) {
      return { err: 403 };
    }
    
    const policy = this.policies.get(policyId);
    if (!policy) {
      return { err: 404 };
    }
    
    policy.active = active;
    this.policies.set(policyId, policy);
    return { ok: true };
  },
  
  isPolicyActive(policyId) {
    const policy = this.policies.get(policyId);
    if (!policy) return false;
    
    return (
        policy.active &&
        policy.endDate >= mockClarity.block.height &&
        policy.startDate <= mockClarity.block.height
    );
  },
  
  setAdmin(newAdmin) {
    if (!this.isAdmin()) {
      return { err: 403 };
    }
    
    this.admin = newAdmin;
    return { ok: true };
  }
};

describe('Policy Management Contract', () => {
  beforeEach(() => {
    // Reset the contract state before each test
    policyManagement.admin = mockClarity.tx.sender;
    policyManagement.policies = new Map();
    policyManagement.policyCounter = 0;
  });
  
  it('should create a policy successfully', () => {
    const result = policyManagement.createPolicy(
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        1000000,
        50000,
        50,
        150,
        'health'
    );
    
    expect(result).toHaveProperty('ok');
    expect(result.ok).toBe(1);
    
    const policy = policyManagement.getPolicy(1);
    expect(policy).not.toBeNull();
    expect(policy.coverageAmount).toBe(1000000);
    expect(policy.policyType).toBe('health');
  });
  
  it('should fail to create a policy with invalid dates', () => {
    const result = policyManagement.createPolicy(
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        1000000,
        50000,
        150, // start date after end date
        100,
        'health'
    );
    
    expect(result).toHaveProperty('err');
    expect(result.err).toBe(400);
  });
  
  it('should update policy status', () => {
    // First create a policy
    policyManagement.createPolicy(
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        1000000,
        50000,
        50,
        150,
        'health'
    );
    
    // Then deactivate it
    const result = policyManagement.updatePolicyStatus(1, false);
    expect(result).toHaveProperty('ok');
    expect(result.ok).toBe(true);
    
    const policy = policyManagement.getPolicy(1);
    expect(policy.active).toBe(false);
  });
  
  it('should check if policy is active', () => {
    // Create an active policy
    policyManagement.createPolicy(
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        1000000,
        50000,
        50,
        150,
        'health'
    );
    
    // Policy should be active (block height is 100)
    expect(policyManagement.isPolicyActive(1)).toBe(true);
    
    // Deactivate the policy
    policyManagement.updatePolicyStatus(1, false);
    expect(policyManagement.isPolicyActive(1)).toBe(false);
  });
  
  it('should transfer admin rights', () => {
    const newAdmin = 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const result = policyManagement.setAdmin(newAdmin);
    
    expect(result).toHaveProperty('ok');
    expect(result.ok).toBe(true);
    expect(policyManagement.admin).toBe(newAdmin);
    
    // Now the original admin should not be able to create policies
    mockClarity.tx.sender = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const createResult = policyManagement.createPolicy(
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        1000000,
        50000,
        50,
        150,
        'health'
    );
    
    expect(createResult).toHaveProperty('err');
    expect(createResult.err).toBe(403);
  });
});
