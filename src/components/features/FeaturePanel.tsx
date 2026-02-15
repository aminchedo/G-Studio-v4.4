import React, { useState } from "react";
import { FEATURES, featureManager } from "@/core/features/featureRegistry";

export const FeaturePanel: React.FC = () => {
  const [features, setFeatures] = useState(FEATURES);

  const toggleFeature = async (featureId: string) => {
    const feature = features[featureId];
    const newEnabled = !feature.enabled;

    setFeatures((prev) => ({
      ...prev,
      [featureId]: { ...prev[featureId], enabled: newEnabled },
    }));

    if (newEnabled) {
      await featureManager.loadFeature(featureId);
    }
  };

  const groupedFeatures = Object.values(features).reduce(
    (acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    },
    {} as Record<string, (typeof FEATURES)[keyof typeof FEATURES][]>,
  );

  return (
    <div className="feature-panel">
      <h2>Feature Management</h2>
      <p className="description">
        Enable or disable features to customize your experience
      </p>

      {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
        <div key={category} className="feature-category">
          <h3>{category.toUpperCase()}</h3>
          <div className="feature-list">
            {categoryFeatures.map((feature) => (
              <div key={feature.id} className="feature-item">
                <div className="feature-info">
                  <label className="feature-name">
                    <input
                      type="checkbox"
                      checked={feature.enabled}
                      onChange={() => toggleFeature(feature.id)}
                    />
                    <span>{feature.name}</span>
                  </label>
                  <p className="feature-description">{feature.description}</p>
                </div>
                <div
                  className={`feature-status ${feature.enabled ? "enabled" : "disabled"}`}
                >
                  {feature.enabled ? "✓ Enabled" : "○ Disabled"}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <style>{`
        .feature-panel {
          padding: 20px;
          max-width: 800px;
        }
        
        .description {
          color: #666;
          margin-bottom: 24px;
        }
        
        .feature-category {
          margin-bottom: 32px;
        }
        
        .feature-category h3 {
          font-size: 14px;
          font-weight: 600;
          color: #888;
          margin-bottom: 12px;
          letter-spacing: 0.5px;
        }
        
        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .feature-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 8px;
          transition: background 0.2s;
        }
        
        .feature-item:hover {
          background: #ebebeb;
        }
        
        .feature-info {
          flex: 1;
        }
        
        .feature-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          cursor: pointer;
        }
        
        .feature-name input {
          cursor: pointer;
        }
        
        .feature-description {
          margin: 8px 0 0 28px;
          font-size: 13px;
          color: #666;
        }
        
        .feature-status {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .feature-status.enabled {
          background: #d4edda;
          color: #155724;
        }
        
        .feature-status.disabled {
          background: #f8d7da;
          color: #721c24;
        }
      `}</style>
    </div>
  );
};
