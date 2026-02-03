import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApplicationSettingsModal } from '@/components/modals/ApplicationSettingsModal';
import { useAppStore } from '@/store/appStore';
import { DEFAULT_ADVANCED_SETTINGS } from '@/config/appConfig';

// Mock dependencies
const mockDispatch = vi.fn().mockResolvedValue({ success: true });

vi.mock('@/store/appStore');
vi.mock('@/hooks/useCommandBus', () => ({
  useCommandBus: () => ({
    dispatch: mockDispatch
  })
}));

describe('ApplicationSettingsModal - Retirement Features', () => {
  const mockOnClose = vi.fn();

  const defaultConfig = {
    currentAge: 30,
    retirementYear: 65,
    advancedSimulationSettings: DEFAULT_ADVANCED_SETTINGS
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as any).mockReturnValue({
      config: defaultConfig
    });
  });

  describe('Settings Initialization', () => {
    it('initializes withdrawal sequence from config', () => {
      const configWithSettings = {
        ...defaultConfig,
        advancedSimulationSettings: {
          ...DEFAULT_ADVANCED_SETTINGS,
          strategySettings: {
            retirementWithdrawal: {
              withdrawalSequence: 'cash_first'
            }
          }
        }
      };

      (useAppStore as any).mockReturnValue({
        config: configWithSettings
      });

      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);

      const withdrawalSelect = screen.getByLabelText(/Withdrawal Sequence Strategy/i);
      expect(withdrawalSelect).toHaveValue('cash_first');
    });

    it('initializes RMD setting from config', () => {
      const configWithSettings = {
        ...defaultConfig,
        advancedSimulationSettings: {
          ...DEFAULT_ADVANCED_SETTINGS,
          strategySettings: {
            retirementWithdrawal: {
              enableAutomaticRMDs: false
            }
          }
        }
      };

      (useAppStore as any).mockReturnValue({
        config: configWithSettings
      });

      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);

      const rmdCheckbox = screen.getByLabelText(/Automatic Required Minimum Distributions/i);
      expect(rmdCheckbox).not.toBeChecked();
    });

    it('initializes Roth conversion settings from config', () => {
      const configWithSettings = {
        ...defaultConfig,
        advancedSimulationSettings: {
          ...DEFAULT_ADVANCED_SETTINGS,
          strategySettings: {
            retirementWithdrawal: {
              enableRothConversions: true,
              rothConversionMaxTaxRate: 32
            }
          }
        }
      };

      (useAppStore as any).mockReturnValue({
        config: configWithSettings
      });

      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);

      const rothCheckbox = screen.getByLabelText(/Roth Conversion Optimization/i);
      expect(rothCheckbox).toBeChecked();

      const taxRateSlider = screen.getByLabelText(/Maximum Tax Rate for Conversions/i);
      expect(taxRateSlider).toHaveValue(32);
    });

    it('initializes Social Security claiming age from config', () => {
      const configWithSettings = {
        ...defaultConfig,
        advancedSimulationSettings: {
          ...DEFAULT_ADVANCED_SETTINGS,
          strategySettings: {
            socialSecurity: {
              plannedClaimingAge: 70
            }
          }
        }
      };

      (useAppStore as any).mockReturnValue({
        config: configWithSettings
      });

      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);

      const claimingAgeSelect = screen.getByLabelText(/Social Security Claiming Age/i);
      expect(claimingAgeSelect).toHaveValue('70');
    });

    it('initializes asset location setting from config', () => {
      const configWithSettings = {
        ...defaultConfig,
        advancedSimulationSettings: {
          ...DEFAULT_ADVANCED_SETTINGS,
          strategySettings: {
            assetLocation: {
              enabled: true
            }
          }
        }
      };

      (useAppStore as any).mockReturnValue({
        config: configWithSettings
      });

      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);

      const assetLocationCheckbox = screen.getByLabelText(/Tax-Efficient Asset Location/i);
      expect(assetLocationCheckbox).toBeChecked();
    });

    it('uses default values when strategySettings is undefined', () => {
      const configWithoutSettings = {
        ...defaultConfig,
        advancedSimulationSettings: {
          ...DEFAULT_ADVANCED_SETTINGS,
          strategySettings: undefined
        }
      };

      (useAppStore as any).mockReturnValue({
        config: configWithoutSettings
      });

      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);

      // Should use default values
      const withdrawalSelect = screen.getByLabelText(/Withdrawal Sequence Strategy/i);
      expect(withdrawalSelect).toHaveValue('tax_efficient');

      const rmdCheckbox = screen.getByLabelText(/Automatic Required Minimum Distributions/i);
      expect(rmdCheckbox).toBeChecked();
    });
  });

  describe('State Updates and UI Interactions', () => {
    beforeEach(() => {
      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);
    });

    it('updates withdrawal sequence when changed', () => {
      const withdrawalSelect = screen.getByLabelText(/Withdrawal Sequence Strategy/i);

      fireEvent.change(withdrawalSelect, { target: { value: 'proportional' } });

      expect(withdrawalSelect).toHaveValue('proportional');
    });

    it('toggles RMD checkbox', () => {
      const rmdCheckbox = screen.getByLabelText(/Automatic Required Minimum Distributions/i);

      // Initial state (default: true)
      expect(rmdCheckbox).toBeChecked();

      fireEvent.click(rmdCheckbox);
      expect(rmdCheckbox).not.toBeChecked();

      fireEvent.click(rmdCheckbox);
      expect(rmdCheckbox).toBeChecked();
    });

    it('toggles Roth conversion checkbox and shows/hides tax rate slider', () => {
      const rothCheckbox = screen.getByLabelText(/Roth Conversion Optimization/i);

      // Initially disabled (default: false)
      expect(rothCheckbox).not.toBeChecked();
      expect(screen.queryByLabelText(/Maximum Tax Rate for Conversions/i)).not.toBeInTheDocument();

      // Enable Roth conversions
      fireEvent.click(rothCheckbox);
      expect(rothCheckbox).toBeChecked();

      // Tax rate slider should now be visible
      const taxRateSlider = screen.getByLabelText(/Maximum Tax Rate for Conversions/i);
      expect(taxRateSlider).toBeInTheDocument();
    });

    it('updates Roth conversion max tax rate slider', () => {
      // Enable Roth conversions first
      const rothCheckbox = screen.getByLabelText(/Roth Conversion Optimization/i);
      fireEvent.click(rothCheckbox);

      const taxRateSlider = screen.getByLabelText(/Maximum Tax Rate for Conversions/i);

      fireEvent.change(taxRateSlider, { target: { value: '32' } });
      expect(taxRateSlider).toHaveValue(32);
    });

    it('updates Social Security claiming age', () => {
      const claimingAgeSelect = screen.getByLabelText(/Social Security Claiming Age/i);

      fireEvent.change(claimingAgeSelect, { target: { value: '62' } });
      expect(claimingAgeSelect).toHaveValue('62');
    });

    it('toggles asset location checkbox', () => {
      const assetLocationCheckbox = screen.getByLabelText(/Tax-Efficient Asset Location/i);

      // Initially disabled (default: false)
      expect(assetLocationCheckbox).not.toBeChecked();

      fireEvent.click(assetLocationCheckbox);
      expect(assetLocationCheckbox).toBeChecked();
    });
  });

  describe('Config Persistence', () => {
    it('saves all retirement settings to config on save', async () => {
      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);

      // Enable Roth conversions to show tax rate slider
      const rothCheckbox = screen.getByLabelText(/Roth Conversion Optimization/i);
      fireEvent.click(rothCheckbox);

      // Change all settings
      const withdrawalSelect = screen.getByLabelText(/Withdrawal Sequence Strategy/i);
      fireEvent.change(withdrawalSelect, { target: { value: 'tax_deferred_first' } });

      const rmdCheckbox = screen.getByLabelText(/Automatic Required Minimum Distributions/i);
      fireEvent.click(rmdCheckbox); // Toggle to false

      const taxRateSlider = screen.getByLabelText(/Maximum Tax Rate for Conversions/i);
      fireEvent.change(taxRateSlider, { target: { value: '22' } });

      const claimingAgeSelect = screen.getByLabelText(/Social Security Claiming Age/i);
      fireEvent.change(claimingAgeSelect, { target: { value: '70' } });

      const assetLocationCheckbox = screen.getByLabelText(/Tax-Efficient Asset Location/i);
      fireEvent.click(assetLocationCheckbox);

      // Click save button
      const saveButton = screen.getByText(/Save Settings/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'UPDATE_CONFIG',
            payload: expect.objectContaining({
              config: expect.any(Function)
            })
          })
        );
      });
    });

    it('closes modal after successful save', async () => {
      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);

      const saveButton = screen.getByText(/Save Settings/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Conditional Rendering', () => {
    it('shows Roth conversion tax rate slider only when conversions are enabled', () => {
      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);

      // Initially hidden
      expect(screen.queryByLabelText(/Maximum Tax Rate for Conversions/i)).not.toBeInTheDocument();

      // Enable Roth conversions
      const rothCheckbox = screen.getByLabelText(/Roth Conversion Optimization/i);
      fireEvent.click(rothCheckbox);

      // Now visible
      expect(screen.getByLabelText(/Maximum Tax Rate for Conversions/i)).toBeInTheDocument();

      // Disable again
      fireEvent.click(rothCheckbox);

      // Hidden again
      expect(screen.queryByLabelText(/Maximum Tax Rate for Conversions/i)).not.toBeInTheDocument();
    });

    it('renders all retirement feature labels', () => {
      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/Withdrawal Sequence Strategy/i)).toBeInTheDocument();
      expect(screen.getByText(/Automatic Required Minimum Distributions/i)).toBeInTheDocument();
      expect(screen.getByText(/Roth Conversion Optimization/i)).toBeInTheDocument();
      expect(screen.getByText(/Social Security Claiming Age/i)).toBeInTheDocument();
      expect(screen.getByText(/Tax-Efficient Asset Location/i)).toBeInTheDocument();
    });

    it('renders retirement features section header', () => {
      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/🏖️ Retirement Features/i)).toBeInTheDocument();
    });
  });

  describe('Validation and Edge Cases', () => {
    it('handles missing nested strategySettings gracefully', () => {
      const incompleteConfig = {
        ...defaultConfig,
        advancedSimulationSettings: {
          ...DEFAULT_ADVANCED_SETTINGS,
          strategySettings: {
            retirementWithdrawal: undefined,
            socialSecurity: undefined,
            assetLocation: undefined
          }
        }
      };

      (useAppStore as any).mockReturnValue({
        config: incompleteConfig
      });

      expect(() => {
        render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);
      }).not.toThrow();
    });

    it('handles null strategySettings', () => {
      const nullConfig = {
        ...defaultConfig,
        advancedSimulationSettings: {
          ...DEFAULT_ADVANCED_SETTINGS,
          strategySettings: null
        }
      };

      (useAppStore as any).mockReturnValue({
        config: nullConfig
      });

      expect(() => {
        render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);
      }).not.toThrow();
    });

    it('tax rate input has correct min/max/step attributes', () => {
      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);

      // Enable Roth conversions
      const rothCheckbox = screen.getByLabelText(/Roth Conversion Optimization/i);
      fireEvent.click(rothCheckbox);

      const taxRateInput = screen.getByLabelText(/Maximum Tax Rate for Conversions/i);
      expect(taxRateInput).toHaveAttribute('type', 'number');
      expect(taxRateInput).toHaveAttribute('min', '10');
      expect(taxRateInput).toHaveAttribute('max', '37');
      expect(taxRateInput).toHaveAttribute('step', '1');
    });

    it('Social Security range slider has correct min/max attributes', () => {
      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);

      const claimingAgeSlider = screen.getByLabelText(/Social Security Claiming Age/i);

      expect(claimingAgeSlider).toHaveAttribute('type', 'range');
      expect(claimingAgeSlider).toHaveAttribute('min', '62');
      expect(claimingAgeSlider).toHaveAttribute('max', '70');
      expect(claimingAgeSlider).toHaveAttribute('step', '1');
    });

    it('withdrawal sequence dropdown has all strategy options', () => {
      render(<ApplicationSettingsModal isOpen={true} onClose={mockOnClose} />);

      const withdrawalSelect = screen.getByLabelText(/Withdrawal Sequence Strategy/i);
      const options = withdrawalSelect.querySelectorAll('option');

      const values = Array.from(options).map(opt => opt.getAttribute('value'));
      expect(values).toContain('tax_efficient');
      expect(values).toContain('cash_first');
      expect(values).toContain('tax_deferred_first');
      expect(values).toContain('proportional');
    });
  });
});
