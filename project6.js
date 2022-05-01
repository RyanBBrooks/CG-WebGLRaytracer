var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
	vec3 color = vec3(0,0,0);
	for ( int i=0; i<NUM_LIGHTS; ++i ) {

		// TO-DO: Check for shadows
		float bias = 0.000001;
		bool shadowed = false;
		Light l = lights[i];
		vec3 d = l.position-position;

		// Check for intersections on path to light source
		for ( int i=0; i<NUM_SPHERES; ++i ) {
 
			// TO-DO: Test for ray-sphere intersection 
			Sphere s = spheres[i];
			vec3 pMC = position - s.center;
			float a = dot(d, d);		
			float b = dot((2.0 * d), pMC);
			float c = dot(pMC, pMC) - s.radius * s.radius;
			float delta = b * b - 4.0 * a * c;
        
        		//check if t is greater than bias
			if(delta>=0.0 ){
        			float t = (-1.0 * b - sqrt(delta)) / (2.0 * a); 
				if(t >= bias && t < 1.0){
					shadowed = true;
					break;
				}
			}
		}

		// TO-DO: If not shadowed, perform shading using the Blinn model		
		if(!shadowed){
			d = normalize(d);
			
			vec3 vPL = d + view;
			vec3 h = normalize(vPL / length(vPL));
			
			float cosT = dot(normal, d);
        		float cosP = dot(normal, h);
			color += (l.intensity * max( 0.0, cosT) * (mtl.k_d + mtl.k_s * pow(  max (0.0, cosP), mtl.n)/cosT));
			
		}
	}
	return color;
}

// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
	hit.t = 1e30;
	bool foundHit = false;
	for ( int i=0; i<NUM_SPHERES; ++i ) {
		// TO-DO: Test for ray-sphere intersection 
		Sphere s = spheres[i]; 
		vec3 pMC = ray.pos - s.center;
		float a = dot(ray.dir, ray.dir);
		float b = dot((2.0 * ray.dir), pMC);
		float c = dot(pMC, pMC) - s.radius * s.radius;
		float delta = (b * b) - (4.0 * a * c);
        
        	// TO-DO: If intersection is found, update the given HitInfo		
		if(delta>=0.0 ){	
			float t = ((-1.0 * b) - sqrt(delta)) / (2.0 * a); 		
			if(t < hit.t && t > 0.00001){
				foundHit = true;
				hit.t = t;
				hit.position = ray.pos + t * ray.dir;
				hit.normal = normalize(hit.position - s.center);
				hit.mtl = s.mtl;
			}

		}
	}
	return foundHit;
}

// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
vec4 RayTracer( Ray ray )
{
	HitInfo hit;
	if ( IntersectRay( hit, ray ) ) {
		vec3 view = normalize( -ray.dir );
		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
		
		// Compute reflections
		vec3 k_s = hit.mtl.k_s;
		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
			if ( bounce >= bounceLimit ) break;
			if ( hit.mtl.k_s.r + hit.mtl.k_s.g + hit.mtl.k_s.b <= 0.0 ) break;
			
			Ray r;	// this is the reflection ray
			HitInfo h;	// reflection hit info
			
			//TO-DO: initialize ray information
			r.dir = normalize(2.0 * dot(view, hit.normal) * hit.normal - view);
			r.pos = hit.position;
			view = normalize( -r.dir );

			if ( IntersectRay( h, r ) ) {
				// TO-DO: Hit found, so shade the hit point
				
				clr  += Shade( h.mtl, h.position, h.normal, view ) * k_s ;

				// TO-DO: Update the loop variables for tracing the next reflection ray
				hit = h;
				k_s *= h.mtl.k_s;
				
				
			} else {
				// The refleciton ray did not intersect with anything,
				// so we are using the environment color
				clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
				break;	// no more reflections
			}
		}
		return vec4( clr, 1 );	// return the accumulated color, including the reflections
	} else {
		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 0 );	// return the environment color
	}
}
`;