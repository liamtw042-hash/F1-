// Track class - manages track data, path generation, and rendering logic

class Track {
    constructor(trackData) {
        this.data = trackData;
        this.name = trackData.name;
        this.shortName = trackData.shortName;

        // Generate the path points from control points
        this.pathPoints = Utils.generatePathPoints(trackData.controlPoints, 25);
        this.totalPoints = this.pathPoints.length;

        // Calculate cumulative distances
        this.cumulativeDistances = this._calculateCumulativeDistances();
        this.totalLength = this.cumulativeDistances[this.cumulativeDistances.length - 1];

        // Generate racing line (slightly inside the track)
        this.racingLine = this._generateRacingLine();

        // Find DRS zones
        this.drsZones = this._processDRSZones();

        // Pit lane points
        this.pitLanePoints = this._generatePitLane();

        // Precalculate track bounds for rendering
        this.bounds = this._calculateBounds();
        this.center = {
            x: (this.bounds.minX + this.bounds.maxX) / 2,
            y: (this.bounds.minY + this.bounds.maxY) / 2
        };

        // Pre-compute normals for each path point
        this.normals = this._computeNormals();
    }

    _calculateCumulativeDistances() {
        const dists = [0];
        for (let i = 1; i < this.pathPoints.length; i++) {
            const prev = this.pathPoints[i - 1];
            const curr = this.pathPoints[i];
            const d = Utils.dist(prev.x, prev.y, curr.x, curr.y);
            dists.push(dists[i - 1] + d);
        }
        // Close the loop
        const last = this.pathPoints[this.pathPoints.length - 1];
        const first = this.pathPoints[0];
        const closingDist = Utils.dist(last.x, last.y, first.x, first.y);
        dists.push(dists[dists.length - 1] + closingDist);
        return dists;
    }

    _generateRacingLine() {
        // Racing line is slightly inside the track at corners
        // We offset inward based on curvature
        const racing = [];
        const n = this.pathPoints.length;

        for (let i = 0; i < n; i++) {
            const prev = this.pathPoints[(i - 1 + n) % n];
            const curr = this.pathPoints[i];
            const next = this.pathPoints[(i + 1) % n];

            // Compute curvature using the cross product
            const dx1 = curr.x - prev.x;
            const dy1 = curr.y - prev.y;
            const dx2 = next.x - curr.x;
            const dy2 = next.y - curr.y;
            const cross = dx1 * dy2 - dy1 * dx2;
            const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            const curvature = Math.abs(cross) / (len1 * len2 + 0.001);

            // Normal vector
            const nx = this.normals[i] ? this.normals[i].nx : 0;
            const ny = this.normals[i] ? this.normals[i].ny : 0;

            const offset = curvature * 200 * (cross > 0 ? -1 : 1);
            const clampedOffset = Utils.clamp(offset, -curr.width * 0.35, curr.width * 0.35);

            racing.push({
                x: curr.x + nx * clampedOffset,
                y: curr.y + ny * clampedOffset,
                speed: this._cornerSpeed(curvature)
            });
        }
        return racing;
    }

    _cornerSpeed(curvature) {
        // Convert curvature to target speed (m/s)
        if (curvature < 0.01) return CONFIG.MAX_SPEED;
        const speed = Utils.clamp(8 / curvature, 8, CONFIG.MAX_SPEED);
        return speed;
    }

    _processDRSZones() {
        const zones = [];
        if (!this.data.drsZonesList) return zones;

        for (const zone of this.data.drsZonesList) {
            const startIdx = Math.floor(zone.start * this.totalPoints);
            const endIdx = Math.floor(zone.end * this.totalPoints);
            const detectionIdx = Math.floor(zone.detectionPoint * this.totalPoints);
            zones.push({ startIdx, endIdx, detectionIdx, start: zone.start, end: zone.end });
        }
        return zones;
    }

    _generatePitLane() {
        // Generate a simple parallel path offset from the track near pit entry/exit
        const pitPoints = [];
        const entryIdx = Math.floor(this.data.pitEntry * this.totalPoints);
        const exitIdx = Math.floor(this.data.pitExit * this.totalPoints);

        // Create pit lane as a parallel offset
        const pitOffset = 20; // meters offset
        for (let i = entryIdx; i !== exitIdx; i = (i + 1) % this.totalPoints) {
            const p = this.pathPoints[i];
            const n = this.normals[i];
            if (n) {
                pitPoints.push({
                    x: p.x + n.nx * pitOffset,
                    y: p.y + n.ny * pitOffset,
                    width: 8
                });
            }
        }
        return pitPoints;
    }

    _calculateBounds() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of this.pathPoints) {
            minX = Math.min(minX, p.x - p.width);
            minY = Math.min(minY, p.y - p.width);
            maxX = Math.max(maxX, p.x + p.width);
            maxY = Math.max(maxY, p.y + p.width);
        }
        return { minX, minY, maxX, maxY };
    }

    _computeNormals() {
        const normals = [];
        const n = this.pathPoints.length;
        for (let i = 0; i < n; i++) {
            const prev = this.pathPoints[(i - 1 + n) % n];
            const next = this.pathPoints[(i + 1) % n];
            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            normals.push({
                tx: dx / (len || 1),
                ty: dy / (len || 1),
                nx: -dy / (len || 1),
                ny: dx / (len || 1)
            });
        }
        return normals;
    }

    // Get progress (0-1) along track from path index
    getProgressFromIndex(idx) {
        return idx / this.totalPoints;
    }

    // Get path index from progress (0-1)
    getIndexFromProgress(progress) {
        return Math.floor(progress * this.totalPoints) % this.totalPoints;
    }

    // Get world position at given progress
    getPositionAtProgress(progress) {
        const idx = Math.floor(progress * this.totalPoints) % this.totalPoints;
        return this.pathPoints[idx];
    }

    // Find which waypoint index a car is at
    findNearestWaypoint(x, y, startIndex, searchRange) {
        const range = searchRange || 50;
        let minDist = Infinity;
        let minIdx = startIndex;

        for (let i = 0; i < range; i++) {
            const idx = (startIndex + i) % this.totalPoints;
            const p = this.pathPoints[idx];
            const d = Utils.distSq(x, y, p.x, p.y);
            if (d < minDist) {
                minDist = d;
                minIdx = idx;
            }
        }

        return { index: minIdx, dist: Math.sqrt(minDist) };
    }

    // Check if position is in a DRS zone
    isInDRSZone(progress) {
        for (const zone of this.drsZones) {
            if (zone.start <= zone.end) {
                if (progress >= zone.start && progress <= zone.end) return true;
            } else {
                // Zone crosses lap start
                if (progress >= zone.start || progress <= zone.end) return true;
            }
        }
        return false;
    }

    // Check DRS detection zone
    isAtDRSDetectionPoint(progress) {
        for (const zone of this.drsZones) {
            const detP = zone.detectionIdx / this.totalPoints;
            if (Math.abs(progress - detP) < 0.005) return true;
        }
        return false;
    }

    // Get track width at a given index
    getWidthAt(idx) {
        return this.pathPoints[idx % this.totalPoints].width || 12;
    }

    // Get look-ahead point for AI
    getLookAheadPoint(idx, distance) {
        const n = this.totalPoints;
        let remaining = distance;
        let currentIdx = idx;

        while (remaining > 0) {
            const nextIdx = (currentIdx + 1) % n;
            const curr = this.pathPoints[currentIdx];
            const next = this.pathPoints[nextIdx];
            const d = Utils.dist(curr.x, curr.y, next.x, next.y);
            if (remaining <= d) {
                const t = remaining / d;
                return {
                    x: Utils.lerp(curr.x, next.x, t),
                    y: Utils.lerp(curr.y, next.y, t),
                    index: currentIdx
                };
            }
            remaining -= d;
            currentIdx = nextIdx;
        }
        return this.pathPoints[currentIdx];
    }

    // Get curvature at a given index
    getCurvatureAt(idx) {
        const n = this.totalPoints;
        const prev = this.pathPoints[(idx - 2 + n) % n];
        const curr = this.pathPoints[idx];
        const next = this.pathPoints[(idx + 2) % n];

        const dx1 = curr.x - prev.x;
        const dy1 = curr.y - prev.y;
        const dx2 = next.x - curr.x;
        const dy2 = next.y - curr.y;
        const cross = Math.abs(dx1 * dy2 - dy1 * dx2);
        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        return cross / (len1 * len2 + 0.001);
    }

    // Check if a point is on the track
    isOnTrack(x, y, tolerance) {
        const tol = tolerance || 2.0;
        const result = Utils.closestPointOnPath(this.pathPoints, x, y);
        const trackWidth = this.pathPoints[result.index].width;
        return result.dist < trackWidth * tol;
    }

    // Get sector at progress
    getSectorAt(progress) {
        const sectors = this.data.sectors;
        if (progress < sectors[0]) return 1;
        if (progress < sectors[1]) return 2;
        return 3;
    }
}
