;; Policy Management Contract
;; Handles insurance policy creation, updates, and retrieval

(define-data-var admin principal tx-sender)

;; Policy data structure
(define-map policies
  { policy-id: uint }
  {
    owner: principal,
    coverage-amount: uint,
    premium: uint,
    start-date: uint,
    end-date: uint,
    active: bool,
    policy-type: (string-ascii 20)
  }
)

;; Counter for policy IDs
(define-data-var policy-counter uint u0)

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Create a new policy
(define-public (create-policy
    (owner principal)
    (coverage-amount uint)
    (premium uint)
    (start-date uint)
    (end-date uint)
    (policy-type (string-ascii 20))
  )
  (begin
    (asserts! (is-admin) (err u403))
    (asserts! (> end-date start-date) (err u400))
    (asserts! (> coverage-amount u0) (err u400))

    (let ((policy-id (+ (var-get policy-counter) u1)))
      (var-set policy-counter policy-id)
      (map-set policies
        { policy-id: policy-id }
        {
          owner: owner,
          coverage-amount: coverage-amount,
          premium: premium,
          start-date: start-date,
          end-date: end-date,
          active: true,
          policy-type: policy-type
        }
      )
      (ok policy-id)
    )
  )
)

;; Get policy details
(define-read-only (get-policy (policy-id uint))
  (map-get? policies { policy-id: policy-id })
)

;; Update policy status (activate/deactivate)
(define-public (update-policy-status (policy-id uint) (active bool))
  (begin
    (asserts! (is-admin) (err u403))
    (let ((policy (unwrap! (map-get? policies { policy-id: policy-id }) (err u404))))
      (map-set policies
        { policy-id: policy-id }
        (merge policy { active: active })
      )
      (ok true)
    )
  )
)

;; Check if policy is active
(define-read-only (is-policy-active (policy-id uint))
  (let ((policy (unwrap-panic (map-get? policies { policy-id: policy-id }))))
    (and
      (get active policy)
      (>= (get end-date policy) block-height)
      (<= (get start-date policy) block-height)
    )
  )
)

;; Transfer admin rights
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err u403))
    (var-set admin new-admin)
    (ok true)
  )
)
