package com.quanta.analisis.servicio;

import com.quanta.analisis.algoritmo.GeneradorDatos;
import com.quanta.analisis.dominio.modelo.BarraOhlcv;
import com.quanta.analisis.dto.DtoActivo;
import com.quanta.analisis.excepcion.ExcepcionActivoNoEncontrado;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * Pruebas unitarias para ServicioActivos.
 *
 * Cada método @Test verifica un comportamiento específico del servicio.
 * @BeforeEach se ejecuta antes de cada prueba para tener un estado limpio.
 * No usa Spring — instancia las clases directamente para mayor velocidad.
 */
class PruebaServicioActivos {

    /** Instancia del servicio bajo prueba */
    private ServicioActivos servicioActivos;

    /**
     * Inicializa el servicio antes de cada prueba.
     * Llama a inicializar() manualmente porque @PostConstruct no se ejecuta fuera de Spring.
     */
    @BeforeEach
    void configurar() {
        servicioActivos = new ServicioActivos(new GeneradorDatos());
        servicioActivos.inicializar();  // Ejecuta el ETL manualmente
    }

    /** Verifica que el ETL carga exactamente 20 activos */
    @Test
    void debeCargar20Activos() {
        List<DtoActivo> activos = servicioActivos.obtenerTodosActivos();
        assertThat(activos).hasSize(20);
    }

    /** Verifica que los tickers esperados están presentes en el sistema */
    @Test
    void debeRetornarTickersCorrectos() {
        List<String> tickers = servicioActivos.obtenerTickers();
        assertThat(tickers).contains("ECOPETROL", "AAPL", "NVDA", "ISA", "JPM");
    }

    /** Verifica que la serie de ECOPETROL tiene entre 850 y 950 barras (~5 años sin fines de semana) */
    @Test
    void debeGenerarNumeroEsperadoDeBarras() {
        List<BarraOhlcv> serie = servicioActivos.obtenerSerie("ECOPETROL");
        assertThat(serie.size()).isBetween(850, 950);
    }

    /** Verifica que el filtro por días retorna exactamente N barras y que son las más recientes */
    @Test
    void debeRetornarSubconjuntoCuandoSePideUnVentana() {
        List<BarraOhlcv> completa  = servicioActivos.obtenerSerie("AAPL");
        List<BarraOhlcv> ultimas90 = servicioActivos.obtenerSerie("AAPL", 90);
        assertThat(ultimas90).hasSize(90);
        // La última barra del subconjunto debe coincidir con la última de la serie completa
        assertThat(ultimas90.get(89).getFecha()).isEqualTo(completa.get(completa.size() - 1).getFecha());
    }

    /** Verifica que buscar un ticker inexistente lanza la excepción correcta */
    @Test
    void debeLanzarExcepcionCuandoTickerNoExiste() {
        assertThatThrownBy(() -> servicioActivos.obtenerActivo("TICKER_INVALIDO"))
                .isInstanceOf(ExcepcionActivoNoEncontrado.class);
    }

    /** Verifica que los precios OHLCV son lógicamente consistentes (High >= Low, etc.) */
    @Test
    void barrasOhlcvDebenTenerDatosValidos() {
        servicioActivos.obtenerSerie("MSFT").forEach(barra -> {
            assertThat(barra.getApertura()).isPositive();
            assertThat(barra.getMaximo()).isGreaterThanOrEqualTo(barra.getApertura());
            assertThat(barra.getMinimo()).isLessThanOrEqualTo(barra.getApertura());
            assertThat(barra.getVolumen()).isPositive();
        });
    }

    /** Verifica el determinismo: dos instancias con misma semilla deben producir los mismos datos */
    @Test
    void seriesDebenSerDeterministas() {
        // Crea una segunda instancia independiente del servicio
        ServicioActivos segundo = new ServicioActivos(new GeneradorDatos());
        segundo.inicializar();  // Genera con las mismas semillas

        List<BarraOhlcv> serieSegunda = segundo.obtenerSerie("NVDA");
        List<BarraOhlcv> seriePrimera = servicioActivos.obtenerSerie("NVDA");

        // Verifica que la primera y la centésima barra son idénticas entre ambas instancias
        assertThat(seriePrimera.get(0).getCierre()).isEqualTo(serieSegunda.get(0).getCierre());
        assertThat(seriePrimera.get(100).getCierre()).isEqualTo(serieSegunda.get(100).getCierre());
    }
}
