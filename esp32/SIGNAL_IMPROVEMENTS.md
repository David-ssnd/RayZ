# Laser Signal Transmission Improvements

## Overview
This document describes the improvements made to enhance signal readability and reliability in the RayZ laser communication system.

## Problems Identified

### 1. **Synchronization Issues**
- **Problem**: No mechanism to detect the start of a message transmission
- **Symptom**: Continuous shifting pattern in received data, always showing "BLE MISMATCH"
- **Root Cause**: Fixed-interval sampling (75ms) without alignment to the actual bit timing (150ms)

### 2. **Sampling Rate Mismatch**
- **Problem**: Sampling every 75ms (2x per bit) without proper edge detection
- **Symptom**: Capturing bits mid-transition, leading to unreliable decoding
- **Root Cause**: No relationship between sample timing and actual bit boundaries

### 3. **No Edge Detection**
- **Problem**: Simple voltage comparison without detecting transitions
- **Symptom**: Unable to determine where one bit ends and another begins
- **Root Cause**: Missing state machine for signal processing

### 4. **Poor Signal Processing**
- **Problem**: Basic threshold calculation without adaptation
- **Symptom**: Threshold doesn't adapt to signal variations
- **Root Cause**: Simple (min + max) / 2 calculation without smoothing

## Solutions Implemented

### 1. **Synchronization Pattern**
```
Protocol: [SYNC PATTERN] + [16-BIT MESSAGE]
Sync Pattern: 1010 1010 (4 bits repeated 2 times)
```

**Benefits:**
- Target knows exactly when a message starts
- Allows alignment of bit sampling windows
- Provides time reference for subsequent bits

**Implementation:**
- Weapon transmits sync pattern before each message
- Target uses state machine to detect sync pattern
- Once synced, target knows exact bit timing

### 2. **Increased Sampling Rate**
```
Old: 75ms interval (13.3 Hz)
New: 10ms interval (100 Hz)
```

**Benefits:**
- 15 samples per bit (150ms bit duration)
- Better edge detection capability
- More accurate threshold calculation
- Able to detect transitions within a bit period

### 3. **Edge Detection with Debouncing**
```cpp
States:
1. SIGNAL_IDLE        - Waiting for signal
2. SIGNAL_DETECTING_SYNC - Looking for sync pattern  
3. SIGNAL_RECEIVING_DATA - Decoding message bits
```

**Features:**
- Detects voltage transitions (edges)
- 2-sample debounce to avoid noise
- Tracks bit timing based on detected edges
- Timeout detection for error recovery

### 4. **Adaptive Threshold**
```cpp
Old: threshold = (min + max) / 2
New: threshold = threshold * 0.8 + midpoint * 0.2
```

**Benefits:**
- Smoothly adapts to changing light conditions
- Running min/max with exponential decay (99% retention)
- Reduces false transitions from noise
- More stable decision boundary

### 5. **Signal Quality Metrics**
```cpp
New Features:
- Signal strength measurement (Vmax - Vmin)
- Minimum signal range threshold (0.3V)
- Enhanced debug output with signal amplitude
```

## Configuration Changes

### `protocol_config.h`
```cpp
// Timing
#define SAMPLE_INTERVAL_MS 10        // 100Hz sampling (was 75ms)
#define SAMPLES_PER_BIT 15           // 15 samples per 150ms bit

// Signal Detection
#define MIN_SIGNAL_RANGE 0.3         // Minimum 0.3V signal to proceed
#define EDGE_DEBOUNCE_SAMPLES 2      // Confirm edges over 2 samples
#define SYNC_TIMEOUT_MS 500          // Max time to find sync

// Synchronization
#define SYNC_PATTERN 0b1010          // Alternating pattern
#define SYNC_PATTERN_BITS 4          // 4 bits
#define SYNC_REPEATS 2               // Repeat 2 times = 8 bits total
```

## Expected Behavior

### Weapon Output:
```
📡 BLE sent | ► Laser | 5000 ms | Sync + 1010011000001010 | Data: 163
```

### Target Output:
```
 📡 BLE | 5000 ms | 1010011000001010 | Expected Data: 163

[SYNC] Signal detected (2.856V) - searching for sync pattern...
[SYNC] Pattern matched! Receiving data...
[DATA] Message complete!
✓ Laser | 5150 ms | 1010011000001010 | Data: 163 (0xA3) | Sig: 2.856V | Thr: 1.6424V | ✓ BLE MATCH
```

## Testing Recommendations

1. **Signal Strength Test**
   - Verify signal amplitude > 0.3V
   - Check min/max voltage values
   - Ensure adequate laser power and photodiode sensitivity

2. **Sync Detection Test**
   - Monitor how quickly sync pattern is detected
   - Check for false sync detections
   - Verify timeout recovery works

3. **Bit Error Rate Test**
   - Send multiple messages
   - Count successful vs failed decodes
   - Check hash validation errors separately from sync errors

4. **Timing Analysis**
   - Measure actual bit duration
   - Verify sampling occurs at bit centers
   - Check for drift over long messages

## Further Optimization Ideas

### Short Term:
1. **Manchester Encoding** - Guaranteed transition every bit for better sync
2. **Longer Sync Pattern** - More reliable detection (e.g., 16 bits)
3. **Preamble Signal** - Constant HIGH for AGC adjustment before sync

### Medium Term:
4. **Forward Error Correction** - Add redundancy (Hamming codes)
5. **Adaptive Bit Duration** - Adjust based on signal quality
6. **Multi-sample Voting** - Use multiple samples per bit for majority decision

### Long Term:
7. **Frequency Shift Keying (FSK)** - Modulate pulse width instead of on/off
8. **Differential Encoding** - Encode data in transitions rather than levels
9. **Checksum Enhancement** - CRC instead of simple XOR hash

## Troubleshooting

### If sync pattern not detected:
- Check signal strength in debug output
- Verify laser is transmitting sync pattern
- Increase `SYNC_REPEATS` or `SYNC_TIMEOUT_MS`
- Add delay between sync and data transmission

### If data decoding fails:
- Check threshold voltage is reasonable
- Verify bit timing alignment
- Increase `EDGE_DEBOUNCE_SAMPLES`
- Monitor for timing drift

### If BLE mismatch persists:
- Verify BLE and laser transmit same data
- Check for off-by-one errors in bit shifting
- Ensure hash calculation matches on both sides

## Performance Metrics

### Before:
- Decode Success Rate: ~0% (continuous shifting pattern)
- Sync Detection: None
- Bit Alignment: Random
- Sample Rate: 13.3 Hz

### After (Expected):
- Decode Success Rate: >95% (with good signal)
- Sync Detection: <100ms
- Bit Alignment: ±5ms
- Sample Rate: 100 Hz

## Code Changes Summary

### Files Modified:
1. `esp32/shared/include/protocol_config.h` - Protocol timing and sync configuration
2. `esp32/target/include/photodiode.hpp` - Added state machine and edge detection
3. `esp32/target/src/photodiode.cpp` - Implemented sync detection and adaptive threshold
4. `esp32/target/src/main.cpp` - Updated output formatting and flow control
5. `esp32/weapon/src/main.cpp` - Added sync pattern transmission

### New Methods:
- `Photodiode::updateThreshold()` - Adaptive threshold calculation
- `Photodiode::detectEdge()` - Edge detection with debouncing
- `Photodiode::isSyncDetected()` - Sync pattern validation
- `Photodiode::sampleBit()` - Single bit sampling
- `Photodiode::getSignalStrength()` - Signal quality metric
- `Photodiode::reset()` - State machine reset
- `sendSyncPattern()` - Weapon-side sync transmission

## Conclusion

These improvements transform the system from a blind sampling approach to an intelligent, synchronized receiver. The addition of edge detection, state machine processing, and sync patterns should dramatically improve decode success rates and make the system more robust to timing variations and signal quality issues.

The key insight is that **timing alignment is critical** - without knowing when a message starts, no amount of sampling will produce consistent results.
