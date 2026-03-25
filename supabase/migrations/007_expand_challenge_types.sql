-- Expand challenge_type enum to include all testable elements
ALTER TYPE challenge_type ADD VALUE IF NOT EXISTS 'price_testing';
ALTER TYPE challenge_type ADD VALUE IF NOT EXISTS 'offer_strategy';
ALTER TYPE challenge_type ADD VALUE IF NOT EXISTS 'checkout_flow';
ALTER TYPE challenge_type ADD VALUE IF NOT EXISTS 'product_page';
ALTER TYPE challenge_type ADD VALUE IF NOT EXISTS 'shipping_strategy';
ALTER TYPE challenge_type ADD VALUE IF NOT EXISTS 'homepage';
ALTER TYPE challenge_type ADD VALUE IF NOT EXISTS 'ad_creative';
